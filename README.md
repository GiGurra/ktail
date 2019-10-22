# ktail
Tail kubernetes logs from service scaling up, upgrading, restarting, etc. In short, what you would expect from kubectl logs, but what kubectl logs just wont let you do.

* Uses kubectl with your current context/ns under the hood.

# Usage

### Print help

```
╰─>$ ktail --help
ktail [options]

Tails logs from current and future pods matching provided criteria. All logs
from pods go to stdout regardless of origin. All internal ktail logs go to std
err.

Options:
  --help             Show help                                         [boolean]
  --version          Show version number                               [boolean]
  --label, -l        filter by label (multiple: all of)                  [array]
  --name, -n         filter by name (multiple: any of)                   [array]
  --maxPods, -p      maximum pods allowed                 [number] [default: 10]
  --maxReadBack, -r  maximum old lines to read back       [number] [default: 20]

Examples:
  ktail -l category=backend -n test    Captures all logs from pods matching both
                                       labels 'category=backend' and pod names
                                       containing 'test'
```

