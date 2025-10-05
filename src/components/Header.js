import React from 'react';
import './Header.css'; // This is the correct path for its own CSS file

function Header({ title = 'El Refugio de las Gibas', navLinks = [] }) {
  return (
    <header className="rustic-header">
      <div className="header-content">
        <h1 className="header-title">{title}</h1>
        {navLinks.length > 0 && (
          <nav className="header-nav">
            <ul className="nav-list">
              {navLinks.map((link, index) => (
                <li key={index} className="nav-item">
                  <a href={link.url} className="nav-link">
                    {link.name}
                  </a>
                </li>
              ))}
            </ul>
          </nav>
        )}
      </div>
    </header>
  );
}

export default Header;