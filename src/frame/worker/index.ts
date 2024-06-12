import {processMessageIntoWorker} from "./WorkerUtil";

// set our listening chain up, so we trigger our pipeline as we receive messages
onmessage = processMessageIntoWorker;

// now that everything is set up, send a ready message to our listener. This avoids us being sent messages before we
// can handle them, reducing the risk we'll drop messages
// jest/jsdom really throw a fit about this line while TSC is fine with it. WorkerUtil contains most of the logic only
// to get around this issue.
postMessage("ready");
