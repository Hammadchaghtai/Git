import re

file_path = r'c:\Users\malib\Documents\fyp\New Project FYP\Project Report Thesis\ICMS_Official_Thesis\chapter4.tex'
with open(file_path, 'r', encoding='utf-8') as f:
    content = f.read()

# Define the massive new Section 4.6 replacement with hardcoded exact coordinates
new_section_4_6 = r'''\section{Database Design}
The database design phase translates the object-oriented business logic into a robust, high-performance persistence layer. Utilizing PostgreSQL as the primary Relational Database Management System (RDBMS), the architecture is normalized to the Third Normal Form (3NF). This normalization eliminates data anomalies and ensures transactional integrity (ACID compliance) during the ingestion of high-throughput telemetry data from the SIEM agents.

\subsection{Physical Data Model (Core ERD)}
To represent the precise table structures, foreign-key constraints, and data types, Figure \ref{fig:core_erd} utilizes a physical Database Schema diagram. This model details the exact column specifications required to instantiate the PostgreSQL database. The schema enforces referential integrity across the aggregation pipeline, ensuring that compliance states are mathematically bound to specific endpoints and regulatory controls.

\begin{figure}[H]
    \centering
    \resizebox{\textwidth}{!}{
    \begin{tikzpicture}[
        table/.style={rectangle, draw=black!90, thick, fill=white, align=left, font=\scriptsize\ttfamily, inner sep=1.5ex, rounded corners=2pt},
        rel/.style={-Stealth, thick, draw=black!80},
        card/.style={font=\scriptsize\bfseries\sffamily, fill=white, inner sep=1pt}
    ]

        % ----------------------------------------------------
        % TABLE PLACEMENT (Strict Grid Layout)
        % ----------------------------------------------------
        \node[table, text width=4.5cm] (users) at (0, 6) {
            \textbf{users} \\
            \rule{4.5cm}{0.4pt} \\
            PK \hspace{1mm} id : UUID \\
            UQ \hspace{1mm} email : VARCHAR(255) \\
            \hspace{5.5mm} password\_hash : VARCHAR(255) \\
            \hspace{5.5mm} role : VARCHAR(50) \\
            \hspace{5.5mm} created\_at : TIMESTAMP
        };

        \node[table, text width=4.5cm] (frameworks) at (8, 6) {
            \textbf{regulatory\_frameworks} \\
            \rule{4.5cm}{0.4pt} \\
            PK \hspace{1mm} id : SERIAL \\
            UQ \hspace{1mm} name : VARCHAR(255) \\
            \hspace{5.5mm} version : VARCHAR(50) \\
            \hspace{5.5mm} is\_active : BOOLEAN
        };

        \node[table, text width=4.5cm] (controls) at (16, 6) {
            \textbf{framework\_controls} \\
            \rule{4.5cm}{0.4pt} \\
            PK \hspace{1mm} id : SERIAL \\
            FK \hspace{1mm} framework\_id : INT \\
            \hspace{5.5mm} clause\_id : VARCHAR(50) \\
            \hspace{5.5mm} objective : TEXT
        };

        \node[table, text width=4.5cm] (endpoints) at (0, 0) {
            \textbf{monitored\_endpoints} \\
            \rule{4.5cm}{0.4pt} \\
            PK \hspace{1mm} agent\_id : VARCHAR(50) \\
            FK \hspace{1mm} managed\_by : UUID \\
            \hspace{5.5mm} hostname : VARCHAR(255) \\
            \hspace{5.5mm} ip\_address : INET \\
            \hspace{5.5mm} status : VARCHAR(20)
        };

        \node[table, text width=4.5cm] (states) at (8, 0) {
            \textbf{compliance\_states} \\
            \rule{4.5cm}{0.4pt} \\
            PK \hspace{1mm} id : BIGSERIAL \\
            FK \hspace{1mm} agent\_id : VARCHAR(50) \\
            FK \hspace{1mm} rule\_mapping\_id : INT \\
            \hspace{5.5mm} status : VARCHAR(20) \\
            \hspace{5.5mm} timestamp : TIMESTAMP
        };

        \node[table, text width=4.5cm] (mappings) at (16, 0) {
            \textbf{rule\_mappings} \\
            \rule{4.5cm}{0.4pt} \\
            PK \hspace{1mm} id : SERIAL \\
            FK \hspace{1mm} control\_id : INT \\
            UQ \hspace{1mm} wazuh\_rule\_id : INT \\
            \hspace{5.5mm} severity\_weight : INT
        };

        % ----------------------------------------------------
        % RELATIONSHIPS (Crow's Foot via 1-to-N lines)
        % ----------------------------------------------------
        \draw[rel] (users.south) -- (endpoints.north) node[pos=0.1, right, card] {1} node[pos=0.9, right, card] {N};
        \draw[rel] (frameworks.east) -- (controls.west) node[pos=0.1, above, card] {1} node[pos=0.9, above, card] {N};
        \draw[rel] (controls.south) -- (mappings.north) node[pos=0.1, right, card] {1} node[pos=0.9, right, card] {N};
        \draw[rel] (endpoints.east) -- (states.west) node[pos=0.1, above, card] {1} node[pos=0.9, above, card] {N};
        \draw[rel] (mappings.west) -- (states.east) node[pos=0.1, above, card] {1} node[pos=0.9, above, card] {N};

    \end{tikzpicture}
    }
    \caption{Physical Database Schema: Core Relational Data Model with Exact Data Types}
    \label{fig:core_erd}
\end{figure}

\subsection{Extended Entity Relationship Diagram (EERD)}
While the physical schema dictates the PostgreSQL implementation, the conceptual constraints are modeled using an Extended Entity Relationship Diagram (EERD). As illustrated in Figure \ref{fig:eerd}, this model maps the system's advanced relational constraints.

The architecture enforces a disjoint (\textbf{d}) specialization hierarchy, splitting the abstract \textit{User Account} superclass into distinct \textit{System Admin} and \textit{Security Auditor} subclasses. This structure dictates Role-Based Access Control (RBAC) inheritance at the database level. Furthermore, the \textit{Compliance State} is correctly modeled as a weak entity (denoted by double lines), as its persistence relies entirely on the identifying relationship with a parent \textit{Monitored Endpoint}.

\begin{figure}[H]
    \centering
    \resizebox{0.9\textwidth}{!}{
    \begin{tikzpicture}[
        entity/.style={rectangle, draw=black!90, thick, fill=blue!10, minimum width=2.8cm, minimum height=1cm, align=center, font=\small\bfseries, rounded corners=2pt},
        weakent/.style={rectangle, double, draw=black!90, thick, fill=blue!5, minimum width=2.8cm, minimum height=1cm, align=center, font=\small\bfseries, rounded corners=2pt},
        rel/.style={diamond, draw=black!90, thick, fill=yellow!20, minimum width=2.5cm, minimum height=1.5cm, align=center, font=\scriptsize\bfseries, aspect=1.5},
        weakrel/.style={diamond, double, draw=black!90, thick, fill=yellow!10, minimum width=2.5cm, minimum height=1.5cm, align=center, font=\scriptsize\bfseries, aspect=1.5},
        disjoint/.style={circle, draw=black!90, thick, fill=white, minimum size=0.6cm, font=\small\bfseries},
        line/.style={thick, draw=black!80},
        attr/.style={ellipse, draw=black!80, fill=white, font=\scriptsize, inner sep=1.5pt},
        card/.style={font=\scriptsize\bfseries, fill=white, inner sep=1pt}
    ]

        % ----------------------------------------------------
        % CORE ENTITIES (Center Y-Axis Stack)
        % ----------------------------------------------------
        \node[entity] (user) at (0, 5) {User Account};
        \node[disjoint] (d) at (0, 3) {d};
        \node[font=\scriptsize\bfseries, right=2pt] at (0, 4) {Is-A};
        
        \node[entity] (admin) at (-4, 1) {System Admin};
        \node[entity] (auditor) at (4, 1) {Security Auditor};

        \node[rel] (monitors) at (-4, -1.5) {Monitors};
        \node[rel] (reviews) at (4, -1.5) {Reviews};

        \node[entity] (endpoint) at (-4, -4) {Monitored Endpoint};
        \node[weakrel] (generates) at (0, -4) {Generates};
        \node[weakent] (state) at (4, -4) {Compliance State};

        % ----------------------------------------------------
        % ATTRIBUTES (Shooting Outwards to Prevent Overlap)
        % ----------------------------------------------------
        % User Attributes (Top)
        \node[attr] (uuid) at (0, 7) {\underline{uuid}};
        \node[attr] (email) at (-2.5, 6) {email};
        \node[attr] (pass) at (2.5, 6) {password};
        \draw[line] (user.north) -- (uuid.south);
        \draw[line] (user.north west) -- (email.south east);
        \draw[line] (user.north east) -- (pass.south west);

        % Subclass Attributes (Far Left / Far Right)
        \node[attr] (clearance) at (-7.5, 1) {clearance\_level};
        \draw[line] (admin.west) -- (clearance.east);

        \node[attr] (cert) at (7.5, 1) {cert\_id};
        \draw[line] (auditor.east) -- (cert.west);

        % Endpoint Attributes (Bottom Left)
        \node[attr] (agent) at (-7.5, -4) {\underline{agent\_id}};
        \node[attr] (hostname) at (-6.5, -5.5) {hostname};
        \node[attr] (ip) at (-4, -6.5) {ip\_address};
        \draw[line] (endpoint.west) -- (agent.east);
        \draw[line] (endpoint.south west) -- (hostname.north east);
        \draw[line] (endpoint.south) -- (ip.north);

        % State Attributes (Bottom Right)
        \node[attr] (timestamp) at (7.5, -4) {\textit{timestamp (Partial)}};
        \node[attr] (status) at (6.5, -5.5) {status};
        \node[attr] (details) at (4, -6.5) {details};
        \draw[line] (state.east) -- (timestamp.west);
        \draw[line] (state.south east) -- (status.north west);
        \draw[line] (state.south) -- (details.north);

        % ----------------------------------------------------
        % STRUCTURAL CONNECTIONS
        % ----------------------------------------------------
        % Inheritance
        \draw[line] (user.south) -- (d.north);
        \draw[line] (d.south) -- ++(0,-0.5) -| (admin.north);
        \draw[line] (d.south) -- ++(0,-0.5) -| (auditor.north);

        % Admin to Endpoint
        \draw[line] (admin.south) -- (monitors.north) node[midway, left, card] {1};
        \draw[line] (monitors.south) -- (endpoint.north) node[midway, left, card] {N};

        % Auditor to State
        \draw[line] (auditor.south) -- (reviews.north) node[midway, right, card] {1};
        \draw[line] (reviews.south) -- (state.north) node[midway, right, card] {N};

        % Weak Entity Dependency
        \draw[line] (endpoint.east) -- (generates.west) node[midway, above, card] {1};
        \draw[line, double] (generates.east) -- (state.west) node[midway, above, card] {N};

    \end{tikzpicture}
    }
    \caption{Extended Entity Relationship Diagram (EERD) with Constraints and Attributes}
    \label{fig:eerd}
\end{figure}
'''

# Replace Section 4.6
parts = re.split(r'\\section\{Database Design\}', content)
if len(parts) == 2:
    new_content = parts[0] + new_section_4_6
    with open(file_path, 'w', encoding='utf-8') as f:
        f.write(new_content)
    print("Database Design section completely overhauled with strict coordinates.")
else:
    print("Could not find Database Design section.")
