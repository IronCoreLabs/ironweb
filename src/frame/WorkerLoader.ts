//Simple shim that is responsible for loading a webworker and creating a new instance of it. We're doing this in a shim because we don't want
//this code to run during unit tests and it's much easier to just mock out this whole include instead of having to mock out the lines in a
//single file. Check out the bundlerOptions.transforms in the karma.conf.js to see how we do this.
const worker: Worker = new Worker(_WORKER_PATH_LOCATION_);
export default worker;
