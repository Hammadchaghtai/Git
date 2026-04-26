import re

file_path = r'c:\Users\malib\Documents\fyp\New Project FYP\Project Report Thesis\ICMS_Official_Thesis\chapter4.tex'
with open(file_path, 'r', encoding='utf-8') as f:
    content = f.read()

new_section_4_8 = r'''
\section{External Interfaces}
The Intelligent Compliance Management System (ICMS) operates within a broader enterprise ecosystem, requiring deterministic and secure communication with external services. This section defines the technical specifications, protocols, and data exchange formats for all external interfaces interacting with the platform.

\subsection{Wazuh SIEM REST API}
The core analytical engine of the ICMS relies on raw telemetry ingested from the external Wazuh Manager. The Celery worker fleet interfaces with the Wazuh RESTful API over HTTPS (TLS 1.3) to retrieve endpoint security states, vulnerability assessments, and active rule configurations. To ensure secure communication, the system authenticates using dynamically generated Bearer tokens or pre-shared API keys provisioned directly on the Wazuh Manager. All data payloads are serialized in JSON format, requiring rigorous parsing and validation against the internal Django ORM schema prior to persistence.

\subsection{SMTP Notification Gateway}
To fulfill the real-time alerting mandates of the compliance workflows, the platform interfaces with an external Simple Mail Transfer Protocol (SMTP) server. When the rules engine detects a critical compliance failure, the backend constructs an HTML-formatted alert payload and transmits it via SMTP over TCP port 587, utilizing STARTTLS encryption. This interface is strictly outbound and operates asynchronously via the message broker to prevent blocking the primary request-response cycle of the API Gateway.

\subsection{Outbound Webhook Integration}
To support interoperability with third-party enterprise tools, such as external incident response platforms or communication channels (e.g., Slack, Microsoft Teams), the ICMS provides an outbound webhook interface. The system dispatches automated HTTP POST requests containing structured JSON event data whenever a defined compliance threshold is breached. To ensure non-repudiation, these payloads include a cryptographic HMAC-SHA256 signature in the request header, allowing the receiving external system to verify the authenticity and integrity of the alert payload.

\subsection{Interface Specification Matrix}
Table \ref{tab:external_interfaces} summarizes the technical parameters and boundary constraints of the platform's external interfaces.

\begin{table}[H]
    \centering
    \caption{External Interface Technical Specifications}
    \label{tab:external_interfaces}
    \renewcommand{\arraystretch}{1.4}
    \resizebox{0.95\textwidth}{!}{
    \begin{tabular}{|l|l|l|l|l|}
        \hline
        \rowcolor{blue!10} 
        \textbf{Interface Target} & \textbf{Network Protocol} & \textbf{Data Format} & \textbf{Authentication Mechanism} & \textbf{Directionality} \\ \hline
        Wazuh Manager API & HTTPS (TCP 443) & JSON & Bearer Token / API Key & Bidirectional (Polling) \\ \hline
        SMTP Relay Server & SMTP (TCP 587) & MIME / HTML & SMTP AUTH (TLS) & Outbound Only \\ \hline
        Enterprise Webhooks & HTTPS (TCP 443) & JSON & HMAC-SHA256 Signatures & Outbound Only \\ \hline
        Client Web Browser & HTTPS (TCP 443) & HTML / JSON & JWT (Stateless) & Bidirectional \\ \hline
    \end{tabular}
    }
\end{table}
'''

# Append to the end of the file
with open(file_path, 'a', encoding='utf-8') as f:
    f.write("\n" + new_section_4_8)
print("External Interfaces section successfully appended.")
