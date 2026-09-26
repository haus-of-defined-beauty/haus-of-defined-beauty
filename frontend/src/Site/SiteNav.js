import React, { useState } from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import SiteLogo from './SiteLogo';
import { profilePath } from './siteAuth';

const LINKS = [
  { to: '/about', label: 'About Us' },
  { to: '/services', label: 'Services' },
  { to: '/masterclasses', label: 'Masterclasses' },
];

function SiteNav() {
  const [open, setOpen] = useState(false);
  const navigate = useNavigate();

  const goProfile = () => { setOpen(false); navigate(profilePath()); };

  return (
    <header className="site-nav">
      <SiteLogo />
      <button
        className="site-nav-toggle"
        aria-label="Toggle menu"
        aria-expanded={open}
        onClick={() => setOpen(o => !o)}
      >
        <span /><span /><span />
      </button>
      <nav className={`site-nav-links ${open ? 'open' : ''}`}>
        {LINKS.map(l => (
          <NavLink key={l.to} to={l.to} onClick={() => setOpen(false)}>{l.label}</NavLink>
        ))}
        <button type="button" className="site-nav-profile" onClick={goProfile}>My Profile</button>
      </nav>
    </header>
  );
}

export default SiteNav;
