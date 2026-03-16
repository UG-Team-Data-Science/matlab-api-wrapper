import * as React from 'react';

import { Container, Grid, Box, Link } from '@mui/material';

import './Layout.css';
import "../../rug-huisstijl.css"
import logo from "../../images/logo--en.png"
import logo_only from "../../images/logo.gif"
import {Home as HomeIcon} from "@mui/icons-material";
import {useLocation} from "react-router-dom";


export function Header() {
  const location = useLocation();

  return (<>
    <div key="top-bar" className="bar-shadow hide-sm"><Container maxWidth="xl"><Grid container spacing={0}>
      <Grid size={8}>
        <img src={logo} alt="Rijksuniversiteit Groningen"/>
        {'founded in 1614 - top 100 university'}
      </Grid>
      <Grid size={4}>
      </Grid>
    </Grid></Container></div>
    <div key="second-top-bar" className="rug-bar">
      <Container maxWidth="xl" className="slash-bg"
                 style={{height: "100%", paddingLeft: "80px", color: "white", fontWeight: 900, flexDirection: "row",
                         display: "flex", justifyContent: "space-between", padding: 0, maxWidth: "100%"}}>
        <Box style={{flexGrow: 1, padding: 0, lineHeight: "50px", color: "white"}}>
          <Link href={"/"} key="home-link" className={ location.pathname === "/" ? "active " : "" }>
            <HomeIcon style={{marginTop: "5px", marginBottom: "-5px"}}/>
          </Link>
          &nbsp;My Magic Model
        </Box>
        <Box style={{flexGrow: 0, padding: 0, lineHeight: "50px", color: "white"}}>
          <Link href={"/privacy"} key="privacy-link" className={ location.pathname.startsWith("/privacy") ? "active " : "" }>Privacy</Link>
          <Link href={"/eula"} key="eula-link" className={ location.pathname.startsWith("/eula") ? "active " : "" }>EULA</Link>
        </Box>
      </Container>
    </div>
  </>);
}
