import React from 'react';
import SiteNav from './SiteNav';
import SiteFooter from './SiteFooter';
import Placeholder from './Placeholder';
import polaroid1 from '../assets/about/polaroid-1.jpg';
import polaroid2 from '../assets/about/polaroid-2.jpg';
import polaroid3 from '../assets/about/polaroid-3.jpg';
import salon from '../assets/about/salon.jpg';
import './About.css';

const ADDRESS_QUERY = '764 4th Avenue, Melville, Johannesburg, 2092';
const MAP_EMBED = `https://www.google.com/maps?q=${encodeURIComponent(ADDRESS_QUERY)}&output=embed`;
const MAP_LINK = `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(ADDRESS_QUERY)}`;

// Photo still a placeholder — swap in a real one when you have it.
const TEAM = [
  {
    name: 'Kgodisho Makwala',
    role: 'Founder',
    text: 'Kgodisho founded Haus of Defined Beauty to bring salon-quality nail, hair, makeup and lash services to Melville — built around precise, personalised work for every client who sits in the chair.',
  },
];

function About() {
  return (
    <div className="site">
      <SiteNav />

      <main>
        <div className="about-top site-marble">
          <section className="about-hero">
            <div className="about-polaroids" aria-hidden="true">
              <div className="polaroid a1"><img src={polaroid1} alt="" /></div>
              <div className="polaroid a2"><img src={polaroid2} alt="" /></div>
              <div className="polaroid a3"><img src={polaroid3} alt="" /></div>
            </div>
            <div className="about-hero-copy">
              <h1>Haus of Defined<br />Beauty at a Glance</h1>
              <p>Haus of Defined Beauty is a nail, hair, makeup and lash studio based in Melville, Johannesburg. What started as a one-chair passion project has grown into a full beauty bar — the goal has always stayed the same: precise, personalised work that makes you feel as good as you look.</p>
              <a href="#contact" className="site-btn site-btn--light">Contact Us</a>
            </div>
          </section>

          <section className="about-find">
            <div className="find-card">
              <div className="find-info">
                <h2>Where To Find Us</h2>
                <p className="find-place">
                  <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 2a7 7 0 0 0-7 7c0 5 7 13 7 13s7-8 7-13a7 7 0 0 0-7-7zm0 9.5A2.5 2.5 0 1 1 12 6a2.5 2.5 0 0 1 0 5.5z" /></svg>
                  27 Boxes
                </p>
                <address className="find-address">
                  764 4th Avenue<br />
                  Melville,<br />
                  Johannesburg<br />
                  2092
                </address>
              </div>
              <div className="find-photo">
                <img src={salon} alt="Inside the Haus of Defined Beauty salon, seen through the window with the logo on the glass" style={{ objectPosition: '50% 55%' }} />
              </div>
              <div className="find-map">
                <iframe
                  title="Map showing Haus of Defined Beauty in Melville, Johannesburg"
                  src={MAP_EMBED}
                  loading="lazy"
                  referrerPolicy="no-referrer-when-downgrade"
                />
                <a href={MAP_LINK} target="_blank" rel="noopener noreferrer" className="find-map-link">
                  Open in Google Maps
                </a>
              </div>
            </div>
          </section>
        </div>

        <section className="about-team">
          <h2>Meet the Founder</h2>
          {TEAM.map((m, i) => (
            <article key={i} className={`team-row ${i % 2 ? 'flip' : ''}`}>
              <div className="team-photo"><Placeholder /></div>
              <div className="team-card">
                <h3>{m.name}</h3>
                <span>{m.role}</span>
                <p>{m.text}</p>
              </div>
            </article>
          ))}
        </section>
      </main>

      <SiteFooter />
    </div>
  );
}

export default About;
