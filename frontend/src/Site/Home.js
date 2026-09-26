import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import SiteNav from './SiteNav';
import SiteFooter from './SiteFooter';
import Placeholder from './Placeholder';
import { bookNowPath } from './siteAuth';
import hero from '../assets/home/hero.jpg';
import polaroid1 from '../assets/home/polaroid-1.jpg';
import polaroid2 from '../assets/home/polaroid-2.jpg';
import polaroid3 from '../assets/home/polaroid-3.jpg';
import serviceNails from '../assets/home/service-nails.jpg';
import serviceHair from '../assets/home/service-hair.jpg';
import serviceMakeup from '../assets/home/service-makeup.jpg';
import serviceEyelashes from '../assets/home/service-eyelashes.jpg';
import './Home.css';

const LOREM = 'Lorem ipsum dolor sit amet, consectetur adipiscing elit, sed do eiusmod tempor incididunt ut labore et dolore magna aliqua.';

const SERVICES = [
  { key: 'nails', title: 'Nails', text: LOREM, img: serviceNails, alt: 'Almond nails with leopard-print tips', pos: '50% 50%' },
  { key: 'hair', title: 'Hair', text: LOREM, img: serviceHair, alt: 'Client with a sleek, straight install', pos: '50% 45%' },
  { key: 'makeup', title: 'MakeUp', text: LOREM, img: serviceMakeup, alt: 'Client with a soft pink makeup look', pos: '50% 40%' },
  { key: 'eyelashes', title: 'Eyelashes', text: LOREM, img: serviceEyelashes, alt: 'Eyelash extensions, before and after', pos: '50% 50%' },
];

const TESTIMONIALS = [
  { name: 'Client Name', text: LOREM },
  { name: 'Client Name', text: LOREM },
  { name: 'Client Name', text: LOREM },
];

function Home() {
  const navigate = useNavigate();
  const [slide, setSlide] = useState(0);
  const t = TESTIMONIALS[slide];
  const step = dir => setSlide(s => (s + dir + TESTIMONIALS.length) % TESTIMONIALS.length);
  const bookNow = () => navigate(bookNowPath());

  return (
    <div className="site">
      <SiteNav />

      <main>
        <section className="home-hero">
          <div className="home-hero-media">
            <img src={hero} alt="Client showing off her freshly done nails" />
          </div>
          <div className="home-hero-copy">
            <h1>Where<br />Beauty is<br />Defined</h1>
            <button className="site-btn site-btn--light" onClick={bookNow}>Book Now</button>
          </div>
        </section>

        <section className="home-intro site-marble">
          <div className="home-intro-copy">
            <p>Passionate, Skilled, and Committed to Delivering Top Quality Services</p>
            <Link to="/about" className="site-btn site-btn--light">About Us</Link>
          </div>
          <div className="home-polaroids" aria-hidden="true">
            <div className="polaroid p1"><img src={polaroid1} alt="" /></div>
            <div className="polaroid p2"><img src={polaroid2} alt="" /></div>
            <div className="polaroid p3"><img src={polaroid3} alt="" /></div>
          </div>
        </section>

        <section className="home-services">
          <h2>Our Services</h2>
          <p className="home-services-sub">{LOREM}</p>
          {SERVICES.map((s, i) => (
            <article key={s.key} className={`svc-card ${i % 2 ? 'flip' : ''}`}>
              <div className="svc-media">
                <img src={s.img} alt={s.alt} style={{ objectPosition: s.pos }} />
              </div>
              <div className="svc-body">
                <h3>{s.title}</h3>
                <p>{s.text}</p>
                <Link to={`/services#${s.key}`} className="svc-more">View More</Link>
              </div>
            </article>
          ))}
          <div className="home-services-cta">
            <button className="site-btn site-btn--dark" onClick={bookNow}>Book Now</button>
          </div>
        </section>

        <section className="home-masterclass">
          <h2>Masterclass</h2>
          <p>{LOREM}</p>
          <Link to="/masterclasses" className="site-btn site-btn--light">Apply Now</Link>
        </section>

        <section className="home-testimonials">
          <h2>Hear From Our Clients</h2>
          <div className="testi-wrap">
            <button className="testi-arrow" aria-label="Previous testimonial" onClick={() => step(-1)}>‹</button>
            <div className="testi-card">
              <span className="testi-quote testi-quote--open" aria-hidden="true">“</span>
              <div className="testi-photo"><Placeholder /></div>
              <div className="testi-body">
                <p>{t.text}</p>
                <span className="testi-name">— {t.name}</span>
              </div>
              <span className="testi-quote testi-quote--close" aria-hidden="true">”</span>
            </div>
            <button className="testi-arrow" aria-label="Next testimonial" onClick={() => step(1)}>›</button>
          </div>
        </section>
      </main>

      <SiteFooter />
    </div>
  );
}

export default Home;
