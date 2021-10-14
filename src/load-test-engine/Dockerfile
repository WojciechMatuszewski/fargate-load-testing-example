FROM golang:alpine as builder

RUN mkdir /app
COPY . /app

WORKDIR /app
RUN go install
RUN go build -o main .

FROM blazemeter/taurus

RUN mkdir /app
COPY --from=builder /app/main /app
WORKDIR /app

ENTRYPOINT [ "./main" ]
