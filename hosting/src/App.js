import React, { useEffect } from 'react';
import { GoogleMap, useLoadScript, Marker, InfoWindow } from "@react-google-maps/api";
import './App.css'
import mapStyles from "./mapStyles";

import usePlacesAutocomplete, { getGeocode, getLatLng } from "use-places-autocomplete";
import { Combobox, ComboboxInput, ComboboxPopover, ComboboxList, ComboboxOption } from "@reach/combobox";
import "@reach/combobox/styles.css";


const libraries = ["places"];
const mapContainerStyle = {

  width: "70vw",
  height: "100vh"
};
const center = {
  lat: 49.895138,
  lng: -97.138374
};
const options = {
  styles: mapStyles,
  disableDefaultUI: true,
  zoomControl: true
}

export default function App() {
  const { isLoaded, loadError } = useLoadScript({
    googleMapsApiKey: process.env.REACT_APP_GOOGLE_MAPS_API_KEY,
    libraries,
  });
  const [markers, setMarkers] = React.useState([]);
  const [selected, setSelected] = React.useState(null);
  const [allDriveTimes, setAllDriveTimes] = React.useState(null);
  const [homes, setHomes] = React.useState(null);
  const [destinations, setDestinations] = React.useState(null);
  const [loading, setLoading] = React.useState(false);

  useEffect(() => {
    setLoading(true);
    const origins = markers.filter(marker => marker.isHome);
    setHomes(origins);
    const destinations = markers.filter(marker => !marker.isHome);
    setDestinations(destinations);
    let driveTimes = Array(origins.length);

    const calls = [];

    origins.forEach((origin, originIndex) => {
      destinations.forEach((dest, index) => {
        calls.push(fetch(`https://us-central1-ihatedriving.cloudfunctions.net/distance`,
          {
            method: 'post',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              origin,
              dest
            })
          })
          .then(res => {
            return res.json();
          })
          .then(res => {
            if (driveTimes[originIndex]) {
              driveTimes[originIndex] += (parseInt(res.rows[0].elements[0].duration.value * 2 * dest.numDrive));
            }
            else {
              driveTimes[originIndex] = (parseInt(res.rows[0].elements[0].duration.value * 2 * dest.numDrive));
            }
          }))
      })
    })
    Promise.all(calls)
      .then(() => {
        let commutes = [];
        origins.forEach((item, index) => {
          commutes.push({ address: item.address, commuteTime: driveTimes[index] })
        })
        setAllDriveTimes(commutes);
        setLoading(false);
      });
  }, [setAllDriveTimes, markers])

  const toggleHome = (index) => {
    let newMarkers = [...markers];

    newMarkers[index].isHome = !newMarkers[index].isHome;
    newMarkers[index].numDrive = 0;

    setMarkers(newMarkers);
  }

  const deleteMarker = (index) => {
    let newMarkers = [...markers];

    newMarkers.splice(index, 1);

    setSelected(null);
    setMarkers(newMarkers);
  }

  const incrementDrive = (index) => {
    let newMarkers = [...markers];

    newMarkers[index].numDrive = newMarkers[index].numDrive + 1;

    setMarkers(newMarkers);
  }

  const decrementDrive = (index) => {
    let newMarkers = [...markers];

    newMarkers[index].numDrive = newMarkers[index].numDrive - 1;

    setMarkers(newMarkers);
  }

  const mapRef = React.useRef();
  const onMapLoad = React.useCallback((map) => {
    mapRef.current = map;
  }, []);

  const panTo = React.useCallback(({ lat, lng, address }) => {
    mapRef.current.panTo({ lat, lng });
    mapRef.current.setZoom(14);

    setMarkers((current) =>
      [...current, {
        lat: lat,
        lng: lng,
        isHome: false,
        numDrive: 0,
        address: address
      },])
  }, []);

  if (loadError) return "Error loading maps";
  if (!isLoaded) return "Loading maps";

  return (
    <div className="row">

      <div className="col info-section">
        <h1>I hate driving 🚦</h1>
        <div className="tutorial">I developed this while trying to find a place to live that would lower my commute time</div>
        <div className="tutorial">This website calculates weekly commute times from different start points (places you might live) using the Google Maps distance matrix API</div>
        <div className="tutorial">Pick locations from your regular commute by selecting them from the search dropdown. Indicate how many times you go there in a week</div>
        <div className="tutorial">Designate which locations are potential home locations to see how long your commute is from each of them</div>

        <ul className="list-group location-list">
          {markers.map((item, index) => {
            let listItem = null;
            let addressName = item.address;
            if (item.address.length > 40) {
              addressName = item.address.substring(0, 37);
              addressName += "..."
            }
            listItem = (
              <li className="list-group-item location">
                <button className="btn btn-primary num-btn" onClick={() => decrementDrive(index)} disabled={item.numDrive < 1}>-</button>
                {item.numDrive}
                <button className="btn btn-primary num-btn" onClick={() => incrementDrive(index)} disabled={item.isHome}>+</button>
                {addressName}
                <button className="btn btn-primary" onClick={() => { toggleHome(index) }}>{item.isHome ? <div>Not home</div> : <div>Set as home</div>}</button>
                <button className="btn btn-primary delete-btn" onClick={() => deleteMarker(index)}>X</button>
              </li>);
            return (listItem)
          })}
        </ul>
        <div class="bottom">
          Created by Matt Kraljevic
        </div>
      </div>
      <div className="col map-section">
        <div class="homes">
          {allDriveTimes.map((item, index) => {
            let addressName = item.address;
            if (item.address.length > 40) {
              addressName = item.address.substring(0, 37);
              addressName += '...'
            }
            return (
              isLoaded ?
                <div className="home"> Living at {addressName} weekly commute time: {Math.floor(item.commuteTime / 60)} minutes</div> : (<div>Loading</div>))
          })}
        </div>
        <Search panTo={panTo} />
        <GoogleMap
          mapContainerStyle={mapContainerStyle}
          zoom={13}
          center={center}
          options={options}
          onLoad={onMapLoad}
        >
          {markers.map((marker, index) => <Marker
            key={index}
            icon={marker.isHome ? './home-24px.svg' : 'business-24px.svg'}
            position={{ lat: marker.lat, lng: marker.lng }}
            onClick={() => {
              setSelected(index);
            }} />)}
          {selected !== null ? (<InfoWindow position={{ lat: markers[selected].lat, lng: markers[selected].lng }}
            onCloseClick={() => { setSelected(null) }}>
            <div>
              {!markers[selected].isHome ?
                <div>
                  <div>How many times do you drive here weekly?</div>
                  <button onClick={() => decrementDrive(selected)} disabled={markers[selected].numDrive < 1}>-</button>
                  {markers[selected].numDrive}
                  <button onClick={() => incrementDrive(selected)} >+</button>
                </div>
                : null}
              <div>
                <button onClick={() => { toggleHome(selected) }}>Home?</button> {markers[selected].isHome ? <div>Yes</div> : <div>No</div>}
              </div>
              <div>
                <button onClick={() => deleteMarker(selected)}>Delete destination</button>
              </div>
            </div>
          </InfoWindow>) : null}
        </GoogleMap>
      </div>
    </div>);
};

function Search({ panTo }) {
  const { ready, value, suggestions: { status, data }, setValue } = usePlacesAutocomplete({
    requestOptions: {
      location: {
        lat: () => 49.895138,
        lng: () => -97.138374
      },
      radius: 200 * 1000
    }
  })

  return (<div className="search">
    <Combobox
      onSelect={async (address) => {
        try {
          const results = await getGeocode({ address });
          const { lat, lng } = await getLatLng(results[0]);
          panTo({ lat, lng, address });
        } catch (error) {
          console.log("error detected");
        }
      }}>
      <ComboboxInput value={value} onChange={(e) => {
        setValue(e.target.value);
      }} disabled={!ready}
        placeholder="please enter an address" />
      <ComboboxPopover>
        <ComboboxList>
          {status === "OK" && data.map(({ id, description }) => <ComboboxOption key={id} value={description} />)}
        </ComboboxList>
      </ComboboxPopover>
    </Combobox>
  </div>)
}