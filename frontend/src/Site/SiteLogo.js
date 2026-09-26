import React from 'react';
import { Link } from 'react-router-dom';
import './Site.css';

function SiteLogo({ tagline = false }) {
  return (
    <Link to="/" className="site-logo" aria-label="Haus of Defined Beauty — home">
      <span className="site-logo-box">
        <span className="site-logo-l1">HAUS OF DEFINED</span>
        <span className="site-logo-l2">BEAUTY</span>
        <span className="site-logo-pill">BEAUTY SALON</span>
      </span>
      {tagline && <span className="site-logo-tagline">Where Beauty Is Defined</span>}
    </Link>
  );
}

export default SiteLogo;
