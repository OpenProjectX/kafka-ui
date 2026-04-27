# Kerberos Compose

This directory contains supporting files for
[`../ui-kerberos.yaml`](../ui-kerberos.yaml).

Start the local Kerberos Kafka stack:

```bash
cd /data/Git/kafka-ui/documentation/compose
docker compose -f ui-kerberos.yaml up -d
```

Kafka UI is available at:

```text
http://localhost:8080
```

The Kerby KDC writes generated files into `kerberos/generated`:

```text
kerberos/generated/client/krb5.conf
kerberos/generated/keytabs/kafka-broker1.keytab
kerberos/generated/keytabs/kafbat-ui.keytab
```

For running the API from the host with the `kerberos` Spring profile, make
`broker1.example.com` resolve locally:

```bash
echo '127.0.0.1 broker1.example.com' | sudo tee -a /etc/hosts
```

Run the API with the host krb5 config:

```bash
JAVA_OPTS="-Djava.security.krb5.conf=/data/Git/kafka-ui/documentation/compose/kerberos/krb5-host.conf" \
  SPRING_PROFILES_ACTIVE=kerberos \
  ./gradlew :api:bootRun
```

Remove generated KDC data when you need a clean realm:

```bash
docker compose -f ui-kerberos.yaml down -v
rm -rf kerberos/generated/*
touch kerberos/generated/.gitkeep
```
