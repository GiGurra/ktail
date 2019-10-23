# ktail
Tail/follows live logs from multiple kubernetes pods. Supports workloads that change over time (scale up/down, restarting, etc). In short, what you would expect from kubectl logs, but what kubectl logs just wont let you do (kubectl logs --tail on stereoids).

* Uses kubectl with your current context/ns under the hood.

# Usage

```
╰─>$ ktail --help
ktail [options]

Tails logs from current and future pods matching provided criteria. All logs
from pods go to stdout regardless of origin. All internal ktail logs go to std
err.

Options:
  --help        Show help                                              [boolean]
  --version     Show version number                                    [boolean]
  --label, -l   filter by label (multiple: all of)                       [array]
  --name, -n    filter by name (multiple: any of)                        [array]
  --max-pods    maximum pods allowed                      [number] [default: 10]
  --interval    poll interval for new pods (ms)          [number] [default: 250]
  --tail        See kubectl --tail=..                     [number] [default: 20]
  --since       See kubectl --since                                     [string]
  --since-time  See kubectl --since-time                                [string]

Examples:
  ktail -l category=backend -n test    Captures all logs from pods matching both
                                       labels 'category=backend' and pod names
                                       containing 'test'
                                       
## Warning

Written in Node.js, which I am a beginner in. All advice on style and best practices in general very welcome!


```

