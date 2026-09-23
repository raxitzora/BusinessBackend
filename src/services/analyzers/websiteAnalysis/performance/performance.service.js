class PerformanceService {
    analyze(resources) {
        return {
            images:
                this.analyzeImages(resources),

            javascript:
                this.analyzeJavaScript(resources),

            css:
                this.analyzeCSSResources(resources),

            fonts:
                this.analyzeFonts(resources),

            compression:
                this.analyzeCompression(resources),

            caching:
                this.analyzeCaching(resources),

            summary:
                this.calculatePerformanceSummary(
                    resources
                ),
        };
    }

    analyzeImages(resources) {
        const images =
            resources.filter(
                (resource) =>
                    resource.type === "image"
            );

        return {
            total: images.length,

            totalSize:
                images.reduce(
                    (sum, image) =>
                        sum + image.size,
                    0
                ),

            largeImages:
                images.filter(
                    (image) =>
                        image.size > 500 * 1024
                ).length,
        };
    }

    analyzeJavaScript(resources) {
        const scripts =
            resources.filter(
                (resource) =>
                    resource.type === "script"
            );

        return {
            total: scripts.length,

            totalSize:
                scripts.reduce(
                    (sum, script) =>
                        sum + script.size,
                    0
                ),

            largeBundles:
                scripts.filter(
                    (script) =>
                        script.size > 250 * 1024
                ).length,
        };
    }

    analyzeCSSResources(resources) {
        const css =
            resources.filter(
                (resource) =>
                    resource.type === "stylesheet"
            );

        return {
            total: css.length,

            totalSize:
                css.reduce(
                    (sum, file) =>
                        sum + file.size,
                    0
                ),
        };
    }

    analyzeFonts(resources) {
        const fonts =
            resources.filter(
                (resource) =>
                    resource.type === "font"
            );

        return {
            total: fonts.length,

            totalSize:
                fonts.reduce(
                    (sum, font) =>
                        sum + font.size,
                    0
                ),
        };
    }

    analyzeCompression(resources) {
        if (resources.length === 0) {
            return false;
        }

        return resources.every(
            (resource) => {
                const encoding =
                    resource.headers[
                        "content-encoding"
                    ];

                return (
                    encoding === "gzip" ||
                    encoding === "br" ||
                    encoding === "deflate"
                );
            }
        );
    }

    analyzeCaching(resources) {
        if (resources.length === 0) {
            return false;
        }

        return resources.every(
            (resource) =>
                Boolean(
                    resource.headers[
                        "cache-control"
                    ]
                )
        );
    }

    calculatePerformanceSummary(resources) {
        const totalSize =
            resources.reduce(
                (sum, resource) =>
                    sum + resource.size,
                0
            );

        return {
            requests:
                resources.length,

            totalSize,

            totalSizeMB:
                (
                    totalSize /
                    1024 /
                    1024
                ).toFixed(2),
        };
    }
}

export default new PerformanceService();