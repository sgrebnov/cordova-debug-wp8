/* 
 * Aardwold mobile runtime library.
 *
 * Do not enable JS strict mode for this file as it 
 * will disable some functionality this library depends on.
 */
window.Aardwolf = new (function() {
    var serverUrl = window.AardwolfServerUrl || 'http://10.0.8.254:8000';
    var breakpoints = {};
    var shouldBreak = function() { return false; };
    var asyncXHR = null;
    var lastFile = '';
    var lastLine = '';
    
    function listenToServer() {
        try {
            dropCommandConnection();
            
            asyncXHR = new XMLHttpRequest();

            console.log("GET>>" + serverUrl + '/mobile/incoming');

            asyncXHR.open('GET', serverUrl + '/mobile/incoming', true);

            

            asyncXHR.onreadystatechange = function () {
                if (asyncXHR.readyState == 4) {
                    if (asyncXHR.responseText) {

                        console.log("asyncXHR.responseText>>" + asyncXHR.responseText);

                        var cmd = safeJSONParse(asyncXHR.responseText);

                        if (cmd && cmd.command == 'eval') {
                            doEval(function(aardwolfEval) { return eval(aardwolfEval); }, cmd);
                        }
                        else {
                            processCommand(cmd);
                        }
                        
                        setTimeout(listenToServer, 0);
                    }
                }
            };
            asyncXHR.send(null);
        } catch (ex) {
            alert('Aardwolf encountered an error while waiting for command: ' + ex.toString());
            listenToServer();
        }
    }
    
    function dropCommandConnection() {
        if (asyncXHR) {
            asyncXHR.abort();
        }
        asyncXHR = null;
    }
    
    function sendToServer(path, payload) {
        try {
            var req = new XMLHttpRequest();

            console.log("POST>>" + serverUrl + '/mobile' + path);

            req.open('POST', serverUrl + '/mobile' + path, false);
            req.setRequestHeader('Content-Type', 'application/json');

            console.log("setRequestHeader");

            console.log("payload>>" + JSON.stringify(payload));

            req.send(JSON.stringify(payload));

            console.log("send");

            return safeJSONParse(req.responseText);
        } catch (ex) {
            console.log('error');
            alert('Aardwolf encountered an error while sending data: ' + ex.toString());
            
            listenToServer();
        }
    }
    
    function replaceConsole() {
        return;

        if (!window.console) {
            window.console = {};
        }
        
        ['info', 'log', 'warn', 'error'].forEach(function(f) {
            var oldFunc = window.console[f];
            
            window.console[f] = function() {
                var args = Array.prototype.slice.call(arguments);
                /* Write to local console before writing to the potentially slow remote console.
                   Make sure that the original function actually exists, otherwise this will
                   case an error on WindowsPhone where the console object is not available. */
                oldFunc && oldFunc.apply(window.console, args);
                sendToServer('/console', { 
                    command: 'print-message',
                    type: f.toUpperCase(),
                    message: args.toString()
                });
            };
        });
    }
    
    function processCommand(cmd) {
        console.log("process command");

        console.log(JSON.stringify(cmd));

        switch (cmd.command) {
            case 'set-breakpoints':
                breakpoints = {};
                cmd.data.forEach(function(bp) {
                    var file = bp[0];
                    var line = bp[1];
                    if (!breakpoints[file]) {
                        breakpoints[file] = {};
                    }
                    breakpoints[file][line] = true;
                });
                return true;
            
            case 'breakpoint-continue':
                shouldBreak = function() { return false; };
                return false;
            
            case 'break-on-next':
            case 'breakpoint-step':
            case 'breakpoint-step-in':
                shouldBreak = function() { return true; };
                return false;
                
            case 'breakpoint-step-out':
                shouldBreak = (function(oldDepth) {
                    return function(depth) {
                        return depth < oldDepth;
                    };
                })(stackDepth);
                return false;
                
            case 'breakpoint-step-over':
                shouldBreak = (function(oldDepth) {
                    return function(depth) {
                        return depth <= oldDepth;
                    };
                })(stackDepth);
                return false;
        }
    }
    
    function doEval(evalScopeFunc, cmd) {
        var evalResult;
        try {
            evalResult = evalScopeFunc(cmd.data);
        } catch (ex) {
            evalResult = 'ERROR: ' + ex.toString();
        }  
        sendToServer('/console', {
            command: 'print-eval-result',
            input: cmd.data,
            result: evalResult
        });
    }
    
    function getStack() {
        var callstack = [];
        var currentFunction = arguments.callee;
        while (currentFunction = currentFunction.caller) {
            var fname = currentFunction.name || '<anonymous>';
            callstack.push(fname);
        }
        return callstack;
    }
    
    function safeJSONParse(str) {
        try {
            return JSON.parse(str);
        } catch (ex) {
            return null;
        }
    }
    
    this.init = function() {
        console.log("init start");
        replaceConsole();
        console.log("replaceConsole end");
        var cmd = sendToServer('/init', {
            command: 'mobile-connected'
        });

        console.log("sendToServer end");

        if (cmd) {
            processCommand(cmd)
        }
        console.log("init end");
        listenToServer();
        console.log("listenToServer end");
    };
    
    this.updatePosition = function(file, line, isDebuggerStatement, evalScopeFunc) {
        /* Webkit's exceptions don't contain any useful file and line data,
           so we keep track of this manually for exception reporting purposes. */
        lastFile = file;
        lastLine = line;
        
        while (true) {
            var isBreakpoint = (breakpoints[file] && breakpoints[file][line]) || /* explicit breakpoint? */
                               isDebuggerStatement ||                            /* debugger; statement? */
                               shouldBreak(stackDepth);                          /* step (in|over|out) or break-on-next? */
            
            if (!isBreakpoint) {
                return;
            }
            
            dropCommandConnection();
            var cmd = sendToServer('/breakpoint', {
                command: 'report-breakpoint',
                file: file,
                line: line,
                stack: getStack().slice(1)
            });
            listenToServer();
            if (!cmd) {
                return;
            }                
            console.log("cmd.command == 'eval'");
            if (cmd.command == 'eval') {
                doEval(evalScopeFunc, cmd);
            }
            else {
                var isInternalCommand = processCommand(cmd);
                if (!isInternalCommand) {
                    return;
                }
            }
        }
    };
    
    this.reportException = function(e) {
        sendToServer('/console', {
            command: 'report-exception',
            message: e.toString(),
            file: lastFile,
            line: lastLine,
            stack: getStack().slice(1)
        });
    }
    
    var stack = [];
    var stackDepth = 0;
    
    this.pushStack = function(functionName, file, line) {
        stack.push([functionName, file, line]);
        ++stackDepth;
    };
    
    this.popStack = function() {
        var f = stack.pop();
        --stackDepth;
    };
    
})();

window.Aardwolf.init();

