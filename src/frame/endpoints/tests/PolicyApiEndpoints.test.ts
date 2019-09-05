import * as PolicyApiEndpoints from "../PolicyApiEndpoints";

describe("PolicyApiEndpoint", () => {
    describe("applyPolicy", () => {
        it("should append all values if set", () => {
            const result = PolicyApiEndpoints.applyPolicy({
                classification: "classy boi",
                category: "catty&batty",
                dataSubject: "Tommy&Fing B",
                substituteId: "CZECH REPUB",
            });
            expect(result.url).toBe("policies?classification=classy%20boi&category=catty%26batty&dataSubject=Tommy%26Fing%20B&id=CZECH%20REPUB");
        });
        it("should leave off unset values", () => {
            const result = PolicyApiEndpoints.applyPolicy({
                classification: "classy boi",
                category: "catty&batty",
            });
            expect(result.url).toBe("policies?classification=classy%20boi&category=catty%26batty");
        });
    });
});
