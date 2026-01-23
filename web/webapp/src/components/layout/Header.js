import * as React from 'react';
import { Container, Grid, Box  } from '@mui/material';

import './Layout.css';
import "../../rug-huisstijl.css"
import logo from "../../images/logo--en.png"
import logo_only from "../../images/logo.gif"


export function Header() {
  return (<>
    <div key="top-bar" className="bar-shadow hide-sm"><Container maxWidth="xl"><Grid container spacing={0}>
      <Grid size={8}>
        <img src={logo} alt="Rijksuniversiteit Groningen"/>
        {'founded in 1614 - top 100 university'}
      </Grid>
      <Grid size={4}>
        {'My Magic Model'}
      </Grid>
    </Grid></Container></div>
    <div key="second-top-bar" className="rug-bar">
      <Box display="flex" height="100%">
        <Box className="slash-bg" width={150} flexShrink={0} p={0}>
          <img className="show-sm" src={logo_only} alt="UG" style={{marginTop: '5px', height: '40px', marginLeft: '20px'}}/>
        </Box>
        <Box flex={1} minWidth={0} p={0} gap={0}>
          My Magic Model Heatmap    
        </Box>
      </Box>
    </div>
  </>);
}