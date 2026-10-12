import React from 'react';
import { Link } from 'react-router-dom';
import SiteLogo from './SiteLogo';

const SOCIAL_HANDLE = '@hausofdefinedbeauty.za';

function SiteFooter() {
  return (
    <footer className="site-footer">
      <div className="site-footer-inner">
        <div className="site-footer-brand">
          <SiteLogo tagline />
        </div>

        <div className="site-footer-col site-footer-address">
          <h6><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 2a7 7 0 0 0-7 7c0 5 7 13 7 13s7-8 7-13a7 7 0 0 0-7-7zm0 9.5A2.5 2.5 0 1 1 12 6a2.5 2.5 0 0 1 0 5.5z" /></svg>Address</h6>
          <p>27 Boxes</p>
          <p>764 4th Avenue<br />Melville, Johannesburg<br />2092</p>
        </div>

        <div className="site-footer-col site-footer-nav">
          <h6>Navigation</h6>
          <Link to="/">Home</Link>
          <Link to="/about">About Us</Link>
          <Link to="/services">Services</Link>
          <Link to="/masterclasses">Masterclasses</Link>
        </div>

        {/* No heading here by design — the number and handles speak for
            themselves. #contact is still the anchor About Us links to. */}
        <div className="site-footer-col site-footer-contact" id="contact">
          <a className="site-footer-line" href="https://wa.me/27814002859" target="_blank" rel="noopener noreferrer" aria-label="WhatsApp +27 81 400 2859">
            <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12.04 2C6.58 2 2.13 6.45 2.13 11.91c0 1.75.46 3.45 1.32 4.95L2 22l5.25-1.38a9.9 9.9 0 0 0 4.79 1.22c5.46 0 9.91-4.45 9.91-9.91a9.85 9.85 0 0 0-2.9-7.01A9.82 9.82 0 0 0 12.04 2zm0 1.67c2.2 0 4.27.86 5.83 2.42a8.2 8.2 0 0 1 2.41 5.82c0 4.54-3.7 8.24-8.25 8.24a8.24 8.24 0 0 1-4.2-1.15l-.3-.18-3.12.82.83-3.04-.2-.31a8.2 8.2 0 0 1-1.26-4.38c0-4.54 3.7-8.24 8.26-8.24zm-2.6 4.1c-.19 0-.5.07-.76.35-.26.28-1 .98-1 2.39s1.02 2.77 1.17 2.96c.14.19 2.01 3.07 4.88 4.19.68.26 1.21.42 1.62.54.68.22 1.3.19 1.79.11.55-.08 1.68-.69 1.92-1.35.24-.66.24-1.23.17-1.35-.07-.11-.26-.18-.54-.32-.28-.14-1.68-.83-1.94-.92-.26-.1-.45-.14-.64.14-.19.28-.73.92-.9 1.11-.16.19-.33.21-.61.07-.28-.14-1.2-.44-2.28-1.41-.84-.75-1.41-1.68-1.58-1.96-.16-.28-.02-.43.13-.57.13-.13.28-.33.42-.5.14-.16.19-.28.28-.47.09-.19.05-.35-.02-.49-.07-.14-.63-1.52-.86-2.08-.23-.55-.46-.47-.63-.48h-.54z" /></svg>
            +27 81 400 2859
          </a>
          <a className="site-footer-line" href="https://www.instagram.com/hausofdefinedbeauty.za" target="_blank" rel="noopener noreferrer" aria-label={`Instagram ${SOCIAL_HANDLE}`}>
            <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 7a5 5 0 1 0 0 10 5 5 0 0 0 0-10zm0 8a3 3 0 1 1 0-6 3 3 0 0 1 0 6zm6.5-8.9a1.2 1.2 0 1 1-2.4 0 1.2 1.2 0 0 1 2.4 0zM21 8.5c0-2.9-2.1-5-5-5H8c-2.9 0-5 2.1-5 5v7c0 2.9 2.1 5 5 5h8c2.9 0 5-2.1 5-5v-7zm-2 7c0 1.8-1.2 3-3 3H8c-1.8 0-3-1.2-3-3v-7c0-1.8 1.2-3 3-3h8c1.8 0 3 1.2 3 3v7z" /></svg>
            {SOCIAL_HANDLE}
          </a>
          <a className="site-footer-line" href="https://www.tiktok.com/@hausofdefinedbeauty.za" target="_blank" rel="noopener noreferrer" aria-label={`TikTok ${SOCIAL_HANDLE}`}>
            <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M16.6 5.82A4.28 4.28 0 0 1 15.54 3h-3.09v12.4a2.59 2.59 0 0 1-2.59 2.5 2.59 2.59 0 1 1 .61-5.16V9.66a5.72 5.72 0 0 0-.61-.03 5.68 5.68 0 1 0 5.68 5.68V9.01a7.35 7.35 0 0 0 4.3 1.38V7.3a4.3 4.3 0 0 1-3.24-1.48z" /></svg>
            {SOCIAL_HANDLE}
          </a>
        </div>
      </div>
    </footer>
  );
}

export default SiteFooter;
