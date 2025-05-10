import React from 'react';
import { Box, Typography, Link, Container, IconButton, Divider, useScrollTrigger, Zoom } from '@mui/material';
import { Facebook, Twitter, Instagram, LinkedIn, KeyboardArrowUp } from '@mui/icons-material';
import srawsmainlogo from "./Assets/srawsmainlogo.png";

const Footer = () => {
  // Function to handle scroll to top
  const scrollToTop = () => {
    window.scrollTo({
      top: 0,
      behavior: 'smooth'
    });
  };

  // Function to display back to top button when scrolled down
  function ScrollTop(props) {
    const trigger = useScrollTrigger();

    return (
      <Zoom in={trigger}>
        <IconButton onClick={scrollToTop} style={{ position: 'fixed', bottom: 20, right: 20 }}>
          <KeyboardArrowUp />
        </IconButton>
      </Zoom>
    );
  }

  return (
    <Box sx={{ backgroundColor: 'transparent', textAlign: 'center', borderTop: '1px solid #e0e0e0', py: 3 }}>
      <Container maxWidth="lg">
        <Box sx={{ mb: 1 }}>
          <img src={srawsmainlogo} alt="Logo" style={{ height: 50 }} />
        </Box>
        <Typography variant="body2" component="div" sx={{ display: 'flex', justifyContent: 'center', flexWrap: 'wrap', mb: 2 }}>
          <Link href="/" sx={{ mx: 1, textDecoration: 'none', color: 'text.primary', cursor: 'pointer', '&:hover': { textDecoration: 'underline', color: 'primary.main' } }}>
            Home
          </Link>
          <Link href="/Help" sx={{ mx: 1, textDecoration: 'none', color: 'text.primary', cursor: 'pointer', '&:hover': { textDecoration: 'underline', color: 'primary.main' } }}>
            Help
          </Link>
          <Link href="/About" sx={{ mx: 1, textDecoration: 'none', color: 'text.primary', cursor: 'pointer', '&:hover': { textDecoration: 'underline', color: 'primary.main' } }}>
            About
          </Link>
          <Link href="/Community-Corner" sx={{ mx: 1, textDecoration: 'none', color: 'text.primary', cursor: 'pointer', '&:hover': { textDecoration: 'underline', color: 'primary.main' } }}>
            Sraws Community
          </Link>
          <Link href="/privacy-policy" sx={{ mx: 1, textDecoration: 'none', color: 'text.primary', cursor: 'pointer', '&:hover': { textDecoration: 'underline', color: 'primary.main' } }}>
            Privacy Policy
          </Link>
          <Link href="/terms-of-service" sx={{ mx: 1, textDecoration: 'none', color: 'text.primary', cursor: 'pointer', '&:hover': { textDecoration: 'underline', color: 'primary.main' } }}>
            Terms of Service
          </Link>
          <Link href="/cookie-policy" sx={{ mx: 1, textDecoration: 'none', color: 'text.primary', cursor: 'pointer', '&:hover': { textDecoration: 'underline', color: 'primary.main' } }}>
            Cookie Policy
          </Link>
          <Link href="/copyright-policy" sx={{ mx: 1, textDecoration: 'none', color: 'text.primary', cursor: 'pointer', '&:hover': { textDecoration: 'underline', color: 'primary.main' } }}>
            Copyright Policy
          </Link>
        </Typography>
        <Divider sx={{ my: 2, borderColor: '#e0e0e0' }} />
        
        <Typography variant="body2" color="text.primary" sx={{ mb: 2 }}>
          Contact us: <Link href="mailto:sraws1226@gmail.com" color="inherit" sx={{ textDecoration: 'none', cursor: 'pointer' }}>sraws1226@gmail.com</Link>
        </Typography>
        <Typography variant="caption" color="text.primary">
          &copy; {new Date().getFullYear()} Sraws. All rights reserved.
        </Typography>
      </Container>
      <ScrollTop />
    </Box>
  );
};

export default Footer;
