#include <WiFi.h>
#include <HTTPClient.h>
#include "config_wifi.h"

#define BOTAO_START   18
#define LED_INTERNO   23
#define FECHADURA     22
#define UV_LAMPADA    15
#define SENSOR_PORTA  19

#define TEMPO_ESPERA_2S        2000
#define TEMPO_PULSO_FECH      1500
#define TEMPO_ESPERA_UV       2000
#define TEMPO_UV              5000
#define INTERVALO_POLLING      3000

enum Estado {
  IDLE,
  AGUARDANDO_2S,
  PULSO_FECHADURA,
  AGUARDA_PORTA_FECHADA,
  ESPERA_2S_POS_PORTA,
  UV_LIGADA,
  FIM_CICLO
};

Estado estado = IDLE;
unsigned long t0 = 0;
bool startTravado = false;
bool portaJaAbriu = false;

bool comandoStartRecebido = false;
unsigned long ultimoPoll = 0;
String eventoPendente = "";
bool enviarEvento(const char* ev, const char* msg = nullptr);

void setup() {
  pinMode(BOTAO_START, INPUT_PULLUP);
  pinMode(SENSOR_PORTA, INPUT_PULLUP);
  pinMode(LED_INTERNO, OUTPUT);
  pinMode(FECHADURA, OUTPUT);
  pinMode(UV_LAMPADA, OUTPUT);

  digitalWrite(LED_INTERNO, LOW);
  digitalWrite(FECHADURA, LOW);
  digitalWrite(UV_LAMPADA, LOW);

  Serial.begin(115200);
  WiFi.begin(WIFI_SSID, WIFI_PASSWORD);
  while (WiFi.status() != WL_CONNECTED) {
    delay(500);
    Serial.print(".");
  }
  Serial.println("\nWiFi OK");
  enviarEvento("READY");
}

void loop() {
  unsigned long agora = millis();

  loopRede(agora);

  bool startON = (digitalRead(BOTAO_START) == LOW);
  bool portaFechada = (digitalRead(SENSOR_PORTA) == LOW);

  switch (estado) {
    case IDLE:
      if (!startON) startTravado = false;
      if ((startON && !startTravado) || comandoStartRecebido) {
        if (comandoStartRecebido) comandoStartRecebido = false;
        startTravado = true;
        digitalWrite(LED_INTERNO, HIGH);
        t0 = agora;
        estado = AGUARDANDO_2S;
        enviarEvento("STARTED");
      }
      break;

    case AGUARDANDO_2S:
      if (agora - t0 >= TEMPO_ESPERA_2S) {
        digitalWrite(FECHADURA, HIGH);
        t0 = agora;
        estado = PULSO_FECHADURA;
      }
      break;

    case PULSO_FECHADURA:
      if (agora - t0 >= TEMPO_PULSO_FECH) {
        digitalWrite(FECHADURA, LOW);
        portaJaAbriu = false;
        estado = AGUARDA_PORTA_FECHADA;
      }
      break;

    case AGUARDA_PORTA_FECHADA:
      if (!portaFechada) {
        if (!portaJaAbriu) enviarEvento("PORTA_ABERTA");
        portaJaAbriu = true;
      }
      if (portaJaAbriu && portaFechada) {
        enviarEvento("PORTA_FECHADA");
        t0 = agora;
        estado = ESPERA_2S_POS_PORTA;
      }
      break;

    case ESPERA_2S_POS_PORTA:
      if (agora - t0 >= TEMPO_ESPERA_UV) {
        digitalWrite(LED_INTERNO, LOW);
        digitalWrite(UV_LAMPADA, HIGH);
        t0 = agora;
        estado = UV_LIGADA;
        enviarEvento("UV_ON");
      }
      break;

    case UV_LIGADA:
      if (!portaFechada) {
        digitalWrite(UV_LAMPADA, LOW);
        enviarEvento("ERROR", "porta aberta durante UV");
        estado = IDLE;
        break;
      }
      if (agora - t0 >= TEMPO_UV) {
        digitalWrite(UV_LAMPADA, LOW);
        enviarEvento("UV_OFF");
        estado = FIM_CICLO;
        enviarEvento("FINISHED");
      }
      break;

    case FIM_CICLO:
      estado = IDLE;
      break;
  }
}

void loopRede(unsigned long agora) {
  if (WiFi.status() != WL_CONNECTED) return;

  if (eventoPendente.length() > 0) {
    int p = eventoPendente.indexOf('|');
    String ev = eventoPendente;
    String msg = "";
    if (p > 0) {
      ev = eventoPendente.substring(0, p);
      msg = eventoPendente.substring(p + 1);
    }
    if (enviarEvento(ev.c_str(), msg.length() ? msg.c_str() : nullptr))
      eventoPendente = "";
  }

  if (agora - ultimoPoll >= INTERVALO_POLLING) {
    ultimoPoll = agora;
    HTTPClient http;
    String url = "http://" + String(BACKEND_HOST) + ":" + String(BACKEND_PORT) +
                 "/api/machines/" + String(MACHINE_ID) + "/next-command";
    http.begin(url);
    http.addHeader("Authorization", "Bearer " + String(MACHINE_TOKEN));
    int code = http.GET();
    if (code == 200) {
      String body = http.getString();
      if (body.indexOf("\"command\":\"START_CYCLE\"") >= 0 && estado == IDLE)
        comandoStartRecebido = true;
    }
    http.end();
  }
}

bool enviarEvento(const char* ev, const char* msg) {
  if (WiFi.status() != WL_CONNECTED) {
    eventoPendente = String(ev);
    if (msg) eventoPendente += "|" + String(msg);
    return false;
  }
  HTTPClient http;
  String url = "http://" + String(BACKEND_HOST) + ":" + String(BACKEND_PORT) +
               "/api/machines/" + String(MACHINE_ID) + "/events";
  http.begin(url);
  http.addHeader("Content-Type", "application/json");
  http.addHeader("Authorization", "Bearer " + String(MACHINE_TOKEN));
  String body = "{\"event\":\"" + String(ev) + "\"";
  if (msg && strlen(msg) > 0) body += ",\"message\":\"" + String(msg) + "\"";
  body += "}";
  int code = http.POST(body);
  http.end();
  return (code >= 200 && code < 300);
}
