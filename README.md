# generator-polymer-init-custom-build

[![Build Status](https://travis-ci.org/plusTTeam/generator-polymer-init-custom-build.svg?branch=master)](https://travis-ci.org/plusTTeam/generator-polymer-init-custom-build)

This generator you can use to build apps using Polymer Starter Kit by PlusTeam with gulp process.

### Setup

##### Prerequisites

First, install [Polymer CLI](https://github.com/Polymer/polymer-cli) and
generator-polymer-init-custom-build using [npm](https://www.npmjs.com) (we
assume you have pre-installed [node.js](https://nodejs.org)).

    npm install -g polymer-cli
    npm install -g plusTTeam/generator-polymer-init-custom-build

##### Initialize project from template

Generate your new project using `polymer init`:

    mkdir my-app
    cd my-app
    polymer init plus-team

### Start the development server

This command serves the app at `http://localhost:8080` and provides basic URL
routing for the app:

    polymer serve --open

### Build

Rather than rely on the usual `polymer build` command, this project gives you an
"escape hatch" so you can include additional steps in your build process.

The included `gulpfile.js` relies on [the `polymer-build` library](https://github.com/Polymer/polymer-build),
the same library that powers Polymer CLI. Out of the box it will clean the
`build` directory, and provide image minification. Follow the comments in the
`gulpfile.js` to add additional steps like JS transpilers or CSS preprocessors.

    npm run build

### Preview the build

This command serves the minified version of the app at `http://localhost:8080`:

    polymer serve build/

### Run tests

This command will run [Web Component Tester](https://github.com/Polymer/web-component-tester)
against the browsers currently installed on your machine:

    polymer test

### Adding a new build step

The `gulpfile.js` already contains an example build step that demonstrates how
to run image minification across your source files. For more examples, refer to
the section in [the polymer-build README on extracting inline sources](https://github.com/Polymer/polymer-build#extracting-inlined-cssjs).

### Adding a new view

You can extend the app by adding more views that will be demand-loaded
e.g. based on the route, or to progressively render non-critical sections of the
application. Each new demand-loaded fragment should be added to the list of
`fragments` in the included `polymer.json` file. This will ensure those
components and their dependencies are added to the list of pre-cached components
(and will have bundles created in the fallback `bundled` build).
