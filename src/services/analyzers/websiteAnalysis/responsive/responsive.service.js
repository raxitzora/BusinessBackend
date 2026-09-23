class ResponsiveService {
    async analyze(page) {
        const result = {};

        result.viewport =
            await this.checkViewport(page);

        result.layout =
            await this.checkResponsiveLayout(page);

        result.images =
            await this.checkResponsiveImages(page);

        result.touchTargets =
            await this.checkTouchTargets(page);

        result.fonts =
            await this.checkFontSizes(page);

        return result;
    }

    async checkResponsiveLayout(page) {
        return await page.evaluate(() => {
            return {
                horizontalScroll:
                    Math.ceil(
                        document.documentElement
                            .scrollWidth
                    ) >
                    Math.ceil(
                        window.innerWidth
                    ),

                pageWidth:
                    document.documentElement
                        .scrollWidth,

                viewportWidth:
                    window.innerWidth,
            };
        });
    }

    async checkResponsiveImages(page) {
        return await page.evaluate(() => {
            const images =
                Array.from(document.images);

            let responsive = 0;
            let fixed = 0;
            let lazy = 0;

            for (const image of images) {
                if (
                    image.loading === "lazy"
                ) {
                    lazy++;
                }

                if (
                    image.hasAttribute(
                        "srcset"
                    ) ||
                    image.style.maxWidth ===
                        "100%" ||
                    getComputedStyle(image)
                        .maxWidth === "100%" ||
                    image.width <=
                        window.innerWidth
                ) {
                    responsive++;
                } else {
                    fixed++;
                }
            }

            return {
                total: images.length,
                responsive,
                fixed,
                lazy,
            };
        });
    }

    async checkFontSizes(page) {
        return await page.$$eval(
            "body *",
            (elements) => {
                let smallFonts = 0;
                let readable = 0;

                for (const element of elements) {
                    const size =
                        parseFloat(
                            getComputedStyle(
                                element
                            ).fontSize
                        );

                    if (size < 14) {
                        smallFonts++;
                    } else {
                        readable++;
                    }
                }

                return {
                    readable,
                    smallFonts,
                };
            }
        );
    }

    async checkTouchTargets(page) {
        return await page.evaluate(() => {
            const elements = [
                ...document.querySelectorAll(
                    "button,a,input,textarea,select,[role='button'],[onclick]"
                ),
            ];

            let small = 0;
            let good = 0;

            for (const element of elements) {
                const rect =
                    element.getBoundingClientRect();

                if (
                    rect.width >= 44 &&
                    rect.height >= 44
                ) {
                    good++;
                } else {
                    small++;
                }
            }

            return {
                total: elements.length,
                good,
                small,
            };
        });
    }

    async checkViewport(page) {
        return await page.evaluate(() => {
            const viewport =
                document.querySelector(
                    "meta[name='viewport']"
                );

            return {
                exists: !!viewport,

                content:
                    viewport?.content || null,
            };
        });
    }
}

export default new ResponsiveService();