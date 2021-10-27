import got from "got";

const gotInstance = got.extend({
  prefixUrl: "xxx"
});

test("can create the load test", async () => {
  const response = await gotInstance("create", {
    body: JSON.stringify({
      concurrency: 1,
      holdFor: "1s",
      rampUp: "1s",
      method: "GET",
      url: "foo.com"
    }),
    method: "POST"
  });

  console.log(response.body);
});
