import websiteAnalysisConfig from "../shared/config.js";

class LinksService {
    async analyzeBrokenLinks(page) {
        const rawLinks = await page.$$eval(
            "a[href]",
            (elements) =>
                elements.map((link) => ({
                    href: link.href,
                    text: link.innerText.trim(),
                }))
        );

        const uniqueLinks = [];
        const seen = new Set();

        for (const link of rawLinks) {
            if (!link.href) {
                continue;
            }

            let url;

            try {
                url = new URL(link.href);
            } catch {
                continue;
            }

            if (
                url.protocol !== "http:" &&
                url.protocol !== "https:"
            ) {
                continue;
            }

            const normalizedUrl = url.href;

            if (seen.has(normalizedUrl)) {
                continue;
            }

            seen.add(normalizedUrl);

            uniqueLinks.push({
                href: normalizedUrl,
                text: link.text || "",
            });
        }

        const linksToCheck =
            uniqueLinks.slice(
                0,
                websiteAnalysisConfig.maxLinks
            );

        const broken = [];

        let currentIndex = 0;

        const worker = async () => {
            while (true) {
                const index = currentIndex++;

                if (
                    index >=
                    linksToCheck.length
                ) {
                    return;
                }

                const link =
                    linksToCheck[index];

                try {
                    const response =
                        await page.request.get(
                            link.href,
                            {
                                timeout:
                                    websiteAnalysisConfig.linkTimeoutMs,

                                failOnStatusCode:
                                    false,
                            }
                        );

                    const status =
                        response.status();

                    if (status >= 400) {
                        broken.push({
                            url: link.href,
                            text: link.text,
                            status,
                        });
                    }
                } catch {
                    broken.push({
                        url: link.href,
                        text: link.text,
                        status: "Failed",
                    });
                }
            }
        };

        const workerCount =
            Math.min(
                websiteAnalysisConfig.linkConcurrency,
                linksToCheck.length
            );

        await Promise.all(
            Array.from(
                {
                    length: workerCount,
                },
                () => worker()
            )
        );

        return {
            total: uniqueLinks.length,

            checked:
                linksToCheck.length,

            truncated:
                uniqueLinks.length >
                linksToCheck.length,

            broken:
                broken.length,

            links: broken,
        };
    }

    async analyzeBrokenImages(page) {
        return await page.evaluate(() => {
            const images =
                Array.from(
                    document.images
                );

            const broken = [];

            for (const image of images) {
                if (
                    !image.complete ||
                    image.naturalWidth === 0
                ) {
                    broken.push({
                        src: image.src,
                        alt: image.alt,
                    });
                }
            }

            return {
                total: images.length,

                broken:
                    broken.length,

                images: broken,
            };
        });
    }
}

export default new LinksService();