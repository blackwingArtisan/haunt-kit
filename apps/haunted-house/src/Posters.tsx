import { useState } from 'react';
import { Poster } from './Poster';
import { LOCAL_ADDRESS_WARNING, POSTER_PLACEMENT_NOTE, defaultAddress, isLocalAddress } from './poster-logic';
import { ROOM_CODES, house, posterLine } from './rooms';

/** The host's print view at #/posters: one poster per room, and controls that are left out of the printout. */
export function Posters() {
  const [address, setAddress] = useState(() => defaultAddress(window.location));
  const local = isLocalAddress(address);

  return (
    <main className="hh-main hh-posters-page" id="hh-main">
      <div className="hh-screen-only hh-posters-head">
        <p>
          <a href="#/">Back to the party</a>
        </p>
        <h1 className="hh-title">Room posters</h1>
        <p className="hh-note">{POSTER_PLACEMENT_NOTE}</p>
        <div className="hh-entry">
          <label className="hh-entry__label" htmlFor="hh-address">
            Address the QR codes open
          </label>
          <input
            id="hh-address"
            className="hh-input hh-input--address"
            type="text"
            inputMode="url"
            value={address}
            onChange={(e) => setAddress(e.target.value)}
            autoComplete="off"
            spellCheck={false}
          />
          <p className="hh-message hh-message--warn" role="status">
            {local ? LOCAL_ADDRESS_WARNING : ''}
          </p>
          <div className="hh-row">
            <button type="button" className="hk-btn" onClick={() => window.print()}>
              Print
            </button>
          </div>
        </div>
      </div>
      <div className="hh-poster-list">
        {house.stops.map((room) => (
          <Poster
            key={room.id}
            name={room.name}
            code={ROOM_CODES[room.id as keyof typeof ROOM_CODES]}
            line={posterLine(room.id)}
            address={address}
          />
        ))}
      </div>
    </main>
  );
}
