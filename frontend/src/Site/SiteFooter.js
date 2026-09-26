import React from 'react';
import { Link } from 'react-router-dom';
import SiteLogo from './SiteLogo';

function SiteFooter() {
  return (
    <footer className="site-footer">
      <div className="site-footer-inner">
        <div className="site-footer-brand">
          <SiteLogo tagline />
        </div>

        <div className="site-footer-col">
          <h6><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 2a7 7 0 0 0-7 7c0 5 7 13 7 13s7-8 7-13a7 7 0 0 0-7-7zm0 9.5A2.5 2.5 0 1 1 12 6a2.5 2.5 0 0 1 0 5.5z" /></svg>Address</h6>
          <p>27 Boxes</p>
          <p>764 4th Avenue<br />Melville, Johannesburg<br />2092</p>
        </div>

        <div className="site-footer-col">
          <h6>Navigation</h6>
          <Link to="/">Home</Link>
          <Link to="/about">About Us</Link>
          <Link to="/services">Services</Link>
          <Link to="/masterclasses">Masterclasses</Link>
        </div>

        <div className="site-footer-col" id="contact">
          <h6>Contact</h6>
          <a className="site-footer-line" href="tel:+27814002859">
            <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M6.6 10.8a15 15 0 0 0 6.6 6.6l2.2-2.2a1 1 0 0 1 1-.25 11 11 0 0 0 3.6.6 1 1 0 0 1 1 1V20a1 1 0 0 1-1 1A17 17 0 0 1 3 4a1 1 0 0 1 1-1h3.5a1 1 0 0 1 1 1c0 1.25.2 2.45.6 3.6a1 1 0 0 1-.25 1z" /></svg>
            +27 81 400 2859
          </a>
          <a className="site-footer-line" href="https://www.instagram.com/hausofdefinedbeauty.za" target="_blank" rel="noopener noreferrer">
            <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 7a5 5 0 1 0 0 10 5 5 0 0 0 0-10zm0 8a3 3 0 1 1 0-6 3 3 0 0 1 0 6zm6.5-8.9a1.2 1.2 0 1 1-2.4 0 1.2 1.2 0 0 1 2.4 0zM21 8.5c0-2.9-2.1-5-5-5H8c-2.9 0-5 2.1-5 5v7c0 2.9 2.1 5 5 5h8c2.9 0 5-2.1 5-5v-7zm-2 7c0 1.8-1.2 3-3 3H8c-1.8 0-3-1.2-3-3v-7c0-1.8 1.2-3 3-3h8c1.8 0 3 1.2 3 3v7z" /></svg>
            @hausofdefinedbeauty.za
          </a>
        </div>
      </div>
    </footer>
  );
}

export default SiteFooter;
