/* FortiGate GCP projects list updater

   This script pulls list of projects available to its service account
   and updates the gcp-project-list in FortiGate SDN connector configuration.
*/

/* Configuration
   This script configuration is driven via the following environment variables:

   GOOGLE_APPLICATION_CREDENTIALS - json file with service account credentials
   FGT_HOST - IP address of FortiGate to be updated
   FGT_PORT - management port number of FortiGate to be updated
   FGT_APIKEY - api key for accessing FortiGate (in production you'd move it to KMS)
   PROJECTS_PARENT - (optional) container with all projects to be scanned, e.g. 'folders/123456789'
   ZONE_FILTER - (optional) space-separated list of zones to restrict connector to (e.g. "europe-west1-b europe-west1-c")
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

var zoneFilter = [];
process.env.ZONE_FILTER.split(" ").forEach( zone => {
  zoneFilter.push({name: zone});
})

/* Function to pull list of available projects in a given folder/org
   and format it for direct use in FortiGate API.
*/
async function getProjectsFiltered(parent='') {
  const projects = pclient.searchProjectsAsync();
  var res = [];

  console.log( "Filtering by "+parent );

  for await (const project of projects) {
    if ( parent == project.parent ) {
      res.push({
        id: project.projectId,
        'gcp-zone-list': zoneFilter
      });
    }
  }
  console.log( 'Found '+res.length+' projects.' )
  return res;
} // getProjectsFiltered()


/* Function to pull list of available projects regardless of folder/org
   and format it for direct use in FortiGate API.
*/
async function getProjects() {
  const projects = pclient.searchProjectsAsync();
  var res = [];

  console.log( "Getting all projects" );

  for await (const project of projects) {
    res.push({id: project.projectId});
  }
  console.log( 'Found '+res.length+' projects.' )
  return res;
} //getProjects()


/* Calls getProjects()/getProjectsFiltered() and updates the SDN connector.
   Note the whole connector gets overwritten, so make sure the definition is
   ok for your environment (it's very basic in this version).

   Connector name (default "gcp") is defined in sdnConnectorName const at the top.

   No support for zone filtering.
*/
async function refreshFgtConnector( orgRoot ) {
  var getProjectsFunction;
  if ( orgRoot === undefined ) {
    getProjectsFunction = getProjects;
  } else {
    getProjectsFunction = getProjectsFiltered;
  }

  axiosSdnConnector.put( `${sdnConnectorName}?access_token=${process.env.FGT_APIKEY}`, {
    type: "gcp",
    'gcp-project-list': await getProjectsFunction( orgRoot )
  })
    .then( res => {
      console.log( "Connector updated successfully." );
    })
    .catch( err => {
      console.log( err );
    })
} //refreshFgtConnector()


refreshFgtConnector(process.env.PROJECTS_PARENT);
