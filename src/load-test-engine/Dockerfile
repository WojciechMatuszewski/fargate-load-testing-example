FROM golang:alpine as builder

RUN mkdir /app
COPY . /app

WORKDIR /app
RUN go install

# Required. Otherwise you will be presented with a weird error. Something about _linux.go something.
ENV CGO_ENABLED=0
RUN go build -o load-test-engine .

FROM blazemeter/taurus

RUN mkdir /app
COPY --from=builder /app/load-test-engine /app/load-test-engine

WORKDIR /app

RUN chmod 755 load-test-engine

ENTRYPOINT []
CMD [ "./load-test-engine" ]
