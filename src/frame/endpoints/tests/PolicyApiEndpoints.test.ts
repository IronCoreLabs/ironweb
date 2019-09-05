import * as PolicyApiEndpoints from "../PolicyApiEndpoints";

describe("PolicyApiEndpoint", () => {
    describe("applyPolicy", () => {
        it("should append all values if set", () => {
            const result = PolicyApiEndpoints.applyPolicy({
                sensitivity: "classy boi",
                category: "catty&batty",
                dataSubject: "Tommy&Fing B",
                substituteUser: "CZECH REPUB",
            });
            expect(result.url).toBe("policies?sensitivity=classy%20boi&category=catty%26batty&dataSubject=Tommy%26Fing%20B&substituteId=CZECH%20REPUB");
        });
        it("should leave off unset values", () => {
            const result = PolicyApiEndpoints.applyPolicy({
                sensitivity: "classy boi",
                category: "catty&batty",
            });
            expect(result.url).toBe("policies?sensitivity=classy%20boi&category=catty%26batty");
        });
    });
});
