## Kubernetes Visualizer

This is a simple visualizer for use with the Kubernetes API.
It displays which pod is placed on which node, to help with visualizing the operation of the scheduler.

### Usage:
   * First install a Kubernetes or Container Engine Cluster
   * ```git clone https://github.com/brendandburns/gcp-live-k8s-visualizer.git```
   * ```kubectl proxy --www=path/to/gcp-live-k8s-visualizer --www-prefix=/my-mountpoint/ --api-prefix=/api/```

Then

    http://127.0.0.1:8001/my-mountpoint/

That's it.  The visualizer uses labels to organize the visualization.  In particular it expects that pods have a ```name``` label.
