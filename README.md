# podplay
Podplay.me - The Multiplatform Podcast Player

## Getting Started
1. Clone The Repository `git clone https://github.com/zimmed/podplay.git`
2. Change directories to newly cloned tree `cd podplay`
3. Lint, generate stylesheets and run server `gulp`

## Build Tasks Provided

### JS Linting
The clientside javascript code in podplay can be linted using JSHint
with `gulp lint`

### LESS Compilation
CSS Stylesheets can be produced from podplay's less sources (found in the styles/ directory)
with `gulp style`

### Run Basic Server
To start a node HTTP server running the podplay express application
run `gulp serve`
