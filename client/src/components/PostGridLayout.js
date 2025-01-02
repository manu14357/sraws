import { Grid } from "@mui/material";
import React from "react";

const PostGridLayout = ({ left, center, right }) => {
  return (
    <Grid container spacing={3} sx={{ 
      // Apply negative margin for mobile
      marginTop: { xs: '-3rem', md: -3 } // Adjust the value as necessary
    }}>
      {/* Left Content */}
      <Grid item xs={12} md={3.3} >
        {left}
      </Grid>

      {/* Center Content */}
      <Grid item xs={12} md={5.5}>
        {center}
      </Grid>

      {/* Right Content */}
      <Grid item xs={12} md={3.2} sx={{ display: { xs: "none", md: "block" } }}>
        {right}
      </Grid>
    </Grid>
  );
};

export default PostGridLayout;
