import React, { useState, useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import SiteNav from './SiteNav';
import SiteFooter from './SiteFooter';
import Placeholder from './Placeholder';
import { bookNowPath } from './siteAuth';
import nailsPhoto from '../assets/services/nails.jpg';
import hairPhoto from '../assets/services/hair.jpg';
import makeupPhoto from '../assets/home/service-makeup.jpg';
import './Services.css';

const BLOCKS = [
  {
    id: 'nails',
    title: 'Nails',
    img: nailsPhoto,
    alt: 'Client with braids and colourful long nails, hands resting at her neck',
    pos: '50% 50%',
    twoColumns: true,
    items: [
      'Plain Gel', 'Plain Acrylic', 'Plain Polygel', 'Gel Toes', 'Acrylic Toes',
      'Polygel Toes', 'Hand Scrub', 'Foot Scrub', 'Full House Scrub',
    ],
    note: 'Further design application is quoted upon appointment.',
  },
  {
    id: 'hair',
    title: 'Hair',
    img: hairPhoto,
    alt: 'Woman in a black dress holding two long bundles of hair',
    pos: '50% 100%',
    fit: 'contain',
    bg: 'linear-gradient(to right, #d6d7d9 0%, #dbdcde 12%, #e1e1e1 25%, #e5e5e5 38%, #e6e6e6 50%, #e6e6e6 62%, #e5e5e5 75%, #e2e2e2 88%, #d1d1d1 100%)',
    fadeTop: true,
    titleY: '70%',
    items: [
      'Basic Install', 'Style + Install', 'Frontal Pony (with your hair)', 'Frontal Pony (with our hair)',
      'Sew-in (with your hair)', 'Sew-in (with our hair)', 'Wig Lines',
    ],
  },
  {
    id: 'makeup',
    title: 'Makeup & Lashes',
    img: makeupPhoto,
    alt: 'Client with a soft pink makeup look',
    pos: '50% 35%',
    items: [
      'Soft Glam', 'Full Glam', 'Eyebrow Shaping', 'Eyebrow Tinting', 'Eyebrow Lamination',
      'Classic Lashes', 'Hybrid Lashes', 'Volume Lashes',
    ],
  },
];

// Written from the client business rules in the Supplementary Specification.
const FAQS = [
  {
    q: 'Payment Policy',
    a: [
      'A booking fee of R100 is compulsory to secure your appointment. It is paid securely online when you book, and your appointment is only confirmed once the payment goes through.',
      'We do not accept cash. Please pay by card or another electronic payment method. Bookings that are not paid for are cancelled automatically.',
    ],
  },
  {
    q: 'Cancellations',
    a: [
      'Please cancel at least 24 hours before your appointment to avoid losing your booking fee.',
      'Within 24 hours of your appointment, cancelling is no longer possible online and the booking fee is forfeited.',
    ],
  },
  {
    q: 'Late Policy',
    a: [
      'Please arrive on time. If you are more than 30 minutes late without letting us know, your appointment will be cancelled automatically.',
      'Please also arrive with clean nails: any existing nail work is treated as a removal service and charged accordingly. Let us know in advance about any specific nail art or custom designs.',
    ],
  },
  {
    q: 'Reschedules',
    a: [
      'You can reschedule from your profile at least 24 hours before your appointment, subject to availability.',
      'Within 24 hours of your appointment, rescheduling is no longer possible and the booking fee is forfeited.',
    ],
  },
];

const INSTAGRAM = 'https://www.instagram.com/hausofdefinedbeauty.za';

function Services() {
  const navigate = useNavigate();
  const { hash } = useLocation();
  const [openFaq, setOpenFaq] = useState(null);

  // Home's "View More" links land here on a section (/services#hair, ...).
  useEffect(() => {
    if (!hash) return;
    const el = document.getElementById(hash.slice(1));
    if (el) el.scrollIntoView();
  }, [hash]);

  const bookNow = () => navigate(bookNowPath());

  return (
    <div className="site">
      <SiteNav />

      <main>
        <div className="svcpage-top site-marble">
          <header className="svcpage-hero">
            <h1>Our Services</h1>
            <p>Making you Feel Sure, Confident &amp; Beautiful</p>
          </header>

          {BLOCKS.map((b, i) => (
            <article key={b.id} id={b.id} className={`svc-block ${i % 2 ? 'flip' : ''}`}>
              {b.id === 'makeup' && <span id="eyelashes" className="svc-anchor" />}
              <div className="svc-block-photo" style={{ background: b.bg, '--title-y': b.titleY }}>
                <img
                  src={b.img}
                  alt={b.alt}
                  className={b.fadeTop ? 'fade-top' : undefined}
                  style={{ objectFit: b.fit || 'cover', objectPosition: b.pos }}
                />
                <h2>{b.title}</h2>
              </div>
              <div className="svc-offer">
                <h3>What We Offer</h3>
                <ul className={b.twoColumns ? 'two-col' : ''}>
                  {b.items.map(item => <li key={item}>{item}</li>)}
                </ul>
                {b.note && <p className="svc-offer-note">{b.note}</p>}
                <button className="site-btn site-btn--light svc-offer-btn" onClick={bookNow}>Book Now</button>
              </div>
            </article>
          ))}
        </div>

        <section className="svcpage-faq">
          <div className="svcpage-inner">
            <h2>FAQs</h2>
            <div className="faq-grid">
              {FAQS.map((f, i) => {
                const open = openFaq === i;
                return (
                  <div key={f.q} className={`faq-item ${open ? 'open' : ''}`}>
                    <button
                      className="faq-q"
                      aria-expanded={open}
                      onClick={() => setOpenFaq(open ? null : i)}
                    >
                      <span>{f.q}</span>
                      <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M6 9l6 6 6-6" /></svg>
                    </button>
                    {open && (
                      <div className="faq-a">
                        {f.a.map((para, j) => <p key={j}>{para}</p>)}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        </section>

        <section className="svcpage-portfolio site-marble">
          <div className="svcpage-inner">
            <h2>Our Portfolio</h2>
            <a href={INSTAGRAM} target="_blank" rel="noopener noreferrer" className="pf-sub">
              View More of Our Work on Our Socials
            </a>
            <div className="pf-grid">
              <div className="pf-tile"><Placeholder /></div>
              <div className="pf-tile"><Placeholder /></div>
            </div>
          </div>
        </section>
      </main>

      <SiteFooter />
    </div>
  );
}

export default Services;
