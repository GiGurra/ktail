#!/usr/bin/env node

const yargs = require('yargs/yargs');
const childProc = require('child_process');

async function main() {
    process.on('SIGINT', () => { process.exit(0) });

    const cmdLine = parseCmdLine();

    const labels = cmdLine.label || [];
    const names = cmdLine.name || [];
    const maxPods = cmdLine['max-pods'];
    const maxReadBack = cmdLine['tail'];
    const pollInterval = cmdLine['interval'];
    const readSinceRel = cmdLine['since'];
    const readSinceAbs = cmdLine['since-time'];

    if (labels.length === 0 && names.length === 0) {
        console.error("Need to specify at least one name (-n) or label (-l) to filter on. see --help");
        process.exit(1);
    }

    if (readSinceRel && readSinceAbs) {
        console.error("Cannot specify both readSinceRel and readSinceAbs command line options. see --help");
        process.exit(1);
    }

    const kubectlSinceArgs = getKubectlSinceArgs(readSinceRel, readSinceAbs);

    // Keep track of monitored pods here
    const monitoredPods = {};

    // noinspection InfiniteLoopJS
    while(true) {

        // Just grab all pod names (can kubectl filter on names except exact match?)
        const cmd = "kubectl get pods -o name" + labels.map(s => " -l " + s).join("");
        const pods = childProc
            .execSync(cmd)
            .toString()
            .split(/\r?\n/)
            .map(p => p.trim())
            .filter(p => p.length > 0);

        for (const pod of pods) {

            if (!monitoredPods[pod] && nameMatches(pod, names)) {

                if (Object.keys(monitoredPods).length >= maxPods) {
                    throw new Error("Too many pods matched. Max pods allowed to follow is " + maxPods);
                }

                try {

                    // Try fetching some lines of logs to see if commands can be executed against this pod/if it is ready
                    childProc.execSync("kubectl logs --tail=1 " + pod, {stdio: 'ignore'});

                    // Some user feedback :S
                    console.error("[ktail] Tailing logs to pod " + pod);

                    // Spawn kubectl process for tailing single pod logs
                    const podLogProc = childProc.spawn(
                        "kubectl", ["logs", "--tail", maxReadBack, "-f", pod].concat(kubectlSinceArgs),
                        {stdio: ['ignore', 'pipe', 'pipe']}
                    );
                    monitoredPods[pod] = podLogProc;

                    // Pipe both stderr and stdout from kubectl to stdout
                    podLogProc.stdout.on('data', data => {
                        format(pod, data, console.log, "stdout");
                    });
                    podLogProc.stderr.on('data', data => {
                        format(pod, data, console.log, "stderr");
                    });

                    // Add exit hook which removes stopped kubectl processes from monitoredPods
                    podLogProc.on('exit', code => {
                        console.error("[ktail] Stopped listening to " + pod + " due to code " + code);
                        if (code !== 0) { // keep this pod name in memory so we dont tail it over and over again if it finished OK
                            delete monitoredPods[pod];
                        }
                    });

                } catch (error) {
                    console.error("[ktail] Unable to tail logs for " + pod + " - it may have just been shut down, or is not yet ready/up")
                }
            }
        }

        await new Promise(done => setTimeout(done, pollInterval));
    }

}

function getKubectlSinceArgs(readSinceRel, readSinceAbs) {
    if (readSinceRel) {
        return ["--since", readSinceRel];
    }
    else if (readSinceAbs) {
        return ["--since-time", readSinceAbs];
    }
    else {
        return [];
    }
}

function format(pod, data, outFn, outName) {
    const lines = data.toString().split(/\r?\n/).map(l => l.replace(/\s+$/g, '')).filter(l => l.length > 0);
    for (const line of lines) {
        outFn("[" + pod + ":" + outName + "] " + line);
    }
}

function nameMatches(pod, names) {
    if (names.length === 0) {
        return true;
    }

    for (const name of names) {
        if (pod.includes(name)) {
            return true;
        }
    }

    return false;
}

function parseCmdLine() {
    // someone who knows yargs can prob improve on this :S.
    return yargs(process.argv.slice(2)).usage(
        '$0 [options]',
        'Tails logs from current and future pods matching provided criteria. ' +
        'All logs from pods go to stdout regardless of origin. ' +
        'All internal ktail logs go to std err.', (yargs) => {
            yargs
                .example("$0 -l category=backend -n test  ",
                    "Captures all logs from pods matching both labels 'category=backend' and pod names containing 'test'"
                )
                .option('label', {
                    alias: 'l',
                    description: 'filter by label (multiple: all of)',
                    type: 'array',
                })
                .option('name', {
                    alias: 'n',
                    description: 'filter by name (multiple: any of)',
                    type: 'array',
                })
                .option('max-pods', {
                    description: 'maximum pods allowed',
                    type: 'number',
                    default: 10
                })
                .option('interval', {
                    description: 'poll interval for new pods (ms)',
                    type: 'number',
                    default: 250
                })
                .option('tail', {
                    description: 'See kubectl --tail=..',
                    type: 'number',
                    default: 20
                })
                .option('since', {
                    description: 'See kubectl --since',
                    type: 'string',
                })
                .option('since-time', {
                    description: 'See kubectl --since-time',
                    type: 'string',
                })
                .strict()
        }).argv;
}

main().catch(error => {
    console.error(error);
    process.exit(1);
});
