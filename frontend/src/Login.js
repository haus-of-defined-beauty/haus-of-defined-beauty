import React from 'react';
import './Login.css';

function Login() {
  const handleGoogleLogin = () => {
    // TODO: wire up Google OAuth
    console.log('Google login');
  };

  return (
    <div className="login-container">
      <div className="login-card">
        <h1>Haus of Defined Beauty</h1>
        <p className="tagline">Where Beauty Is Defined</p>
        <button className="google-btn" onClick={handleGoogleLogin}>
          Sign in with Google
        </button>
      </div>
    </div>
  );
}

export default Login;
