/* FortiGate projects list updater

   This script pulls list of projects available to its service account
   and updates the gcp-project-list in FortiGate SDN connector configuration.
*/

/* Configuration
   This script configuration is driven via the following environment variables:

   GOOGLE_APPLICATION_CREDENTIALS - json file with service account credentials
   FGT_HOST - IP address of FortiGate to be updated
   FGT_PORT - management port number of FortiGate to be updated
   FGT_APIKEY - api key for accessing FortiGate (in production you'd move it to KMS)
*/

const {ProjectsClient} = require('@google-cloud/resource-manager');
const Axios = require('axios');
const https = require('https');

// Update this const if your SDN Connector has a different name
const sdnConnectorName = 'gcp';

const pclient = new ProjectsClient();
const axiosSdnConnector = Axios.create({
  baseURL: `https://${process.env.FGT_HOST}:${process.env.FGT_PORT}/api/v2/cmdb/system/sdn-connector/`,
  httpsAgent: new https.Agent({
    rejectUnauthorized: false
  })
})

/* Function to pull list of available projects in a given folder/org
   and format it for direct use in FortiGate API.
*/
async function getProjectsFiltered(parent='') {
  const projects = pclient.searchProjectsAsync();
  var res = [];

  for await (const project of projects) {
    if ( parent == project.parent ) {
      res.push({id: project.projectId});
    }
  }
  return res;
} // getProjectsFiltered()


/* Function to pull list of available projects regardless of folder/org
   and format it for direct use in FortiGate API.
*/
async function getProjects() {
  const projects = pclient.searchProjectsAsync();
  var res = [];

  for await (const project of projects) {
    res.push({id: project.projectId});
  }
  return res;
} //getProjects()


/* Calls getProjects()/getProjectsFiltered() and updates the SDN connector.
   Note the whole connector gets overwritten, so make sure the definition is
   ok for your environment (it's very basic in this version).

   Connector name (default "gcp") is defined in sdnConnectorName const at the top.

   No support for zone filtering.
*/
async function refreshFgtConnector( orgRoot ) {
  axiosSdnConnector.put( `${sdnConnectorName}?access_token=${process.env.FGT_APIKEY}`, {
    type: "gcp",
    'gcp-project-list': await getProjects( orgRoot )
  })
    .then( res => {
      console.log( "Connector updated." );
    })
    .catch( err => {
      console.log( err );
    })
} //refreshFgtConnector()

/*
// not needed at the moment

function getFgtGcpProjectList() {
  axiosSdnConnector.get( `${sdnConnectorName}/gcp-project-list?access_token=${process.env.FGT_APIKEY}` )
    .then( res => {
      console.log( res.data );
    })
    .catch( err => {
      console.log( err );
    })
}
*/

refreshFgtConnector('folders/556234849856');
