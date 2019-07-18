//Simple shim that is responsible for loading a webworker and creating a new instance of it. We're doing this in a shim because we don't want
//this code to run during unit tests and it's much easier to just mock out this whole file
/*global _WORKER_PATH_LOCATION_*/
const worker: Worker = new Worker(_WORKER_PATH_LOCATION_);
export default worker;
