FROM golang:alpine as builder

RUN mkdir /app
COPY . /app

WORKDIR /app
RUN go install
RUN go build -o main .

FROM alpine

RUN mkdir /app
COPY --from=builder /app/main /app
WORKDIR /app

CMD [ "./main" ]
