import re

file_path = r'c:\Users\malib\Documents\fyp\New Project FYP\Project Report Thesis\ICMS_Official_Thesis\chapter4.tex'
with open(file_path, 'r', encoding='utf-8') as f:
    content = f.read()

new_section_4_7 = r'''
\section{Graphical User Interface (GUI) Design}
The Graphical User Interface (GUI) serves as the primary interaction layer between the system administrators, auditors, and the underlying compliance engine. Built as a React Single Page Application (SPA), the interface prioritizes Human-Computer Interaction (HCI) principles, minimizing cognitive load through a clean, data-driven layout. The system natively supports global theme switching (Dark/Light mode) for accessibility; however, to maintain document conciseness, the following architectural views are primarily demonstrated in the default Dark Mode.

\subsection{Authentication and Identity Management}
The authentication portal serves as the secure entry point to the ISCMS platform. The interface is deliberately minimalist to focus the user's attention on credential submission, securely routing them to their respective Role-Based Access Control (RBAC) dashboards upon JWT validation.

\begin{figure}[H]
    \centering
    \framebox{\rule{0pt}{2.5in} \rule{0.8\textwidth}{0pt}} 
    % INSTRUCTION: Replace the \framebox line above with: \includegraphics[width=0.8\textwidth]{your_login_screenshot.png}
    \caption{GUI Design: Secure User Authentication Portal}
    \label{fig:gui_login}
\end{figure}

\subsection{Superadmin Configuration Portal}
The Superadmin role possesses absolute read/write authority over the ISCMS platform. The interface provides deep visibility into the Wazuh telemetry pipeline, framework mapping configurations, and user management. 

\begin{figure}[H]
    \centering
    \framebox{\rule{0pt}{3in} \rule{0.9\textwidth}{0pt}}
    \caption{GUI Design: Superadmin Global Compliance Dashboard}
    \label{fig:gui_superadmin_dashboard}
\end{figure}

\begin{figure}[H]
    \centering
    \framebox{\rule{0pt}{3in} \rule{0.9\textwidth}{0pt}}
    \caption{GUI Design: Framework and Wazuh Rule Mapping Interface}
    \label{fig:gui_superadmin_mapping}
\end{figure}

\begin{figure}[H]
    \centering
    \framebox{\rule{0pt}{3in} \rule{0.9\textwidth}{0pt}}
    \caption{GUI Design: Monitored Endpoints and Telemetry Synchronization Status}
    \label{fig:gui_superadmin_endpoints}
\end{figure}

\subsection{Admin and Auditor Workspaces}
To enforce strict separation of duties, the UI dynamically re-renders based on the authenticated user's RBAC scope. System Admins retain operational control over endpoints but lack global framework configuration rights. Conversely, Security Auditors are granted a strict read-only environment to ensure compliance evidence remains immutable during review.

\begin{figure}[H]
    \centering
    \framebox{\rule{0pt}{2.5in} \rule{0.85\textwidth}{0pt}}
    \caption{GUI Design: System Admin Operational Dashboard}
    \label{fig:gui_admin_dashboard}
\end{figure}

\begin{figure}[H]
    \centering
    \framebox{\rule{0pt}{2.5in} \rule{0.85\textwidth}{0pt}}
    \caption{GUI Design: Security Auditor Read-Only Compliance View}
    \label{fig:gui_auditor_dashboard}
\end{figure}

\begin{figure}[H]
    \centering
    \framebox{\rule{0pt}{2.5in} \rule{0.85\textwidth}{0pt}}
    \caption{GUI Design: Auditor Report Generation Modal}
    \label{fig:gui_auditor_export}
\end{figure}

\subsection{Automated PDF Audit Artifacts}
A critical deliverable of the ISCMS platform is the automated compilation of executive audit reports. The backend rendering engine aggregates dynamic PostgreSQL states into heavily formatted PDF artifacts. The following views represent the system-generated output utilized by external governance bodies.

\begin{figure}[H]
    \centering
    \framebox{\rule{0pt}{3.5in} \rule{0.65\textwidth}{0pt}}
    \caption{System Output: Automated PDF Report - Cover and Executive Summary}
    \label{fig:gui_pdf_cover}
\end{figure}

\begin{figure}[H]
    \centering
    \framebox{\rule{0pt}{3.5in} \rule{0.65\textwidth}{0pt}}
    \caption{System Output: Automated PDF Report - Aggregated Framework Control Matrix}
    \label{fig:gui_pdf_matrix}
\end{figure}

\begin{figure}[H]
    \centering
    \framebox{\rule{0pt}{3.5in} \rule{0.65\textwidth}{0pt}}
    \caption{System Output: Automated PDF Report - Technical Wazuh Telemetry Evidence}
    \label{fig:gui_pdf_telemetry}
\end{figure}
'''

# Append to the end of the file
with open(file_path, 'w', encoding='utf-8') as f:
    f.write(content + "\n" + new_section_4_7)
print("GUI Design section successfully appended.")
