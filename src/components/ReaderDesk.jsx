import React from 'react';
import { ClosedBook, ListingCover } from './LandingUI';

/* ─────────────────────────────────────────────────────────────
   READER'S DESK — the top of the reader dashboard.
   A leather desk with "drawers" that jump to each tab, a small
   pile of the reader's own books and a sticky note for news.
   Display only: it reads data the dashboard already loaded.
   ───────────────────────────────────────────────────────────── */
const PILE = [
  { left: '4%', top: '14%', w: '40%', rot: -9, z: 1 },
  { left: '30%', top: '2%', w: '42%', rot: 3, z: 3 },
  { left: '56%', top: '16%', w: '39%', rot: 11, z: 2 },
];

const Drawer = ({ value, label, note, onClick }) => (
  <button
    type="button"
    onClick={onClick}
    className="paper group relative rounded-lg px-4 pt-3 pb-3.5 text-left flex flex-col items-start justify-start min-w-0 hover:-translate-y-0.5 transition-transform"
  >
    <span className="block w-full h-[15px] text-[10px] font-bold uppercase tracking-[0.14em] text-leather-600 truncate">{label}</span>
    <span className="block font-display font-extrabold text-4xl leading-none text-stone-900 mt-1.5">{value}</span>
    <span className="block w-full font-hand text-lg leading-tight text-moss-700 mt-1 whitespace-nowrap truncate group-hover:underline underline-offset-2">
      {note} →
    </span>
  </button>
);

const ReaderDesk = ({ user, listings, sentRequests, receivedRequests, transactions, unread, onOpen }) => {
  const firstName = (user?.name || 'Reader').split(' ')[0];
  const available = listings.filter((l) => l.status === 'available').length;
  const offersWaiting = receivedRequests.filter((r) => r.status === 'pending').length;
  const proposalsOut = sentRequests.filter((r) => r.status === 'pending').length;
  const inProgress = transactions.filter((t) => !['completed', 'cancelled'].includes(t.status)).length;
  const pile = listings.slice(0, 3);

  return (
    <section className="leather-sand stitched stitched-moss rounded-xl p-5 sm:p-6 shadow-[0_14px_30px_-16px_rgba(70,40,15,0.45)]">
      <div className="relative z-[2] grid grid-cols-1 xl:grid-cols-[1fr_260px] gap-6 items-center">
        <div className="space-y-4">
          <div>
            <span className="font-hand text-2xl text-moss-700">your reading desk</span>
            <h2 className="font-display font-extrabold text-3xl deboss leading-tight">{firstName}'s Bookshelf</h2>
          </div>

          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
            <Drawer value={available} label="On your shelf" note={`${listings.length} listed in all`} onClick={() => onOpen('listings')} />
            <Drawer value={offersWaiting} label="Offers waiting" note="review them" onClick={() => onOpen('received_requests')} />
            <Drawer value={proposalsOut} label="Proposals out" note="track them" onClick={() => onOpen('sent_requests')} />
            <Drawer value={inProgress} label="In progress" note="handovers" onClick={() => onOpen('transactions')} />
          </div>
        </div>

        {/* Pile of the reader's own books + sticky note */}
        <div className="relative hidden xl:block h-[210px]">
          {pile.map((book, i) => (
            <div
              key={book.id}
              className="absolute"
              style={{ left: PILE[i].left, top: PILE[i].top, width: PILE[i].w, zIndex: PILE[i].z, transform: `rotate(${PILE[i].rot}deg)` }}
            >
              <ClosedBook>
                <ListingCover listing={book} />
              </ClosedBook>
            </div>
          ))}
          <button
            type="button"
            onClick={() => onOpen('notifications')}
            className="paper-lined absolute -bottom-1 -left-2 z-10 rotate-[-4deg] w-[150px] rounded-sm pl-14 pr-3 pt-2 pb-2 text-left shadow-[0_8px_16px_-6px_rgba(70,40,15,0.45)] hover:rotate-0 transition-transform"
          >
            <span className="block font-hand text-xl leading-[1.1] text-stone-800">
              {unread > 0 ? `${unread} new note${unread > 1 ? 's' : ''}` : 'all caught up'}
            </span>
          </button>
        </div>
      </div>
    </section>
  );
};

export default ReaderDesk;
