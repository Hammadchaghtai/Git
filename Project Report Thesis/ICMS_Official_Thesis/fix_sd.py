import re

with open(r"c:\Users\malib\Documents\fyp\New Project FYP\Project Report Thesis\ICMS_Official_Thesis\chapter4.tex", "r", encoding="utf-8") as f:
    text = f.read()

# 1. Fix reply style globally in chapter4
text = text.replace("reply/.style={Stealth-, thick, dashed, draw=black!80}", "reply/.style={-Stealth, thick, dashed, draw=black!80}")

def replace_sd(text, caption_regex, new_content):
    pattern = re.compile(r"(\\begin\{tikzpicture\}.*?\\end\{tikzpicture\})[^\\]*?\\caption\{" + caption_regex + r"\}", re.DOTALL)
    match = pattern.search(text)
    if not match:
        print(f"Could not find {caption_regex}")
        return text
    full_match = match.group(0)
    tikz_block = match.group(1)
    new_full_match = full_match.replace(tikz_block, new_content)
    return text.replace(full_match, new_full_match)

# SD-01-1
sd01_1 = r"""\begin{tikzpicture}[
        node distance=2cm,
        inst/.style={rectangle, draw=black!90, thick, fill=blue!5, minimum width=2.8cm, minimum height=0.8cm, font=\small\bfseries, rounded corners=2pt},
        act/.style={rectangle, draw=black!90, fill=gray!20, minimum width=0.3cm},
        msg/.style={-Stealth, thick, draw=black!90},
        reply/.style={-Stealth, thick, dashed, draw=black!80},
        label/.style={font=\scriptsize, inner sep=2pt}
    ]
        \node[inst] (client) at (0, 0) {React SPA};
        \node[inst] (api) at (4.5, 0) {API Gateway};
        \node[inst] (iam) at (9, 0) {IAM Module};
        \node[inst] (db) at (13.5, 0) {PostgreSQL};
        \draw[dashed, draw=black!60, thick] (client.south) -- ++(0, -8);
        \draw[dashed, draw=black!60, thick] (api.south) -- ++(0, -8);
        \draw[dashed, draw=black!60, thick] (iam.south) -- ++(0, -8);
        \draw[dashed, draw=black!60, thick] (db.south) -- ++(0, -8);
        \draw[act] ([xshift=-0.15cm, yshift=-1.5cm]client.south) rectangle ([xshift=0.15cm, yshift=-7.5cm]client.south);
        \draw[act] ([xshift=-0.15cm, yshift=-1.5cm]api.south) rectangle ([xshift=0.15cm, yshift=-7.5cm]api.south);
        \draw[act] ([xshift=-0.15cm, yshift=-2.5cm]iam.south) rectangle ([xshift=0.15cm, yshift=-6.5cm]iam.south);
        \draw[act] ([xshift=-0.15cm, yshift=-3.5cm]db.south) rectangle ([xshift=0.15cm, yshift=-4.5cm]db.south);
        \draw[msg] ([yshift=-1.5cm]client.south) -- ([yshift=-1.5cm]api.south) node[midway, above=2pt, label] {1. POST /login};
        \draw[msg] ([yshift=-2.5cm]api.south) -- ([yshift=-2.5cm]iam.south) node[midway, above=2pt, label] {2. Verify()};
        \draw[msg] ([yshift=-3.5cm]iam.south) -- ([yshift=-3.5cm]db.south) node[midway, above=2pt, label] {3. Query User};
        \draw[reply] ([yshift=-4.5cm]db.south) -- ([yshift=-4.5cm]iam.south) node[midway, above=2pt, label] {4. Return Hash};
        \draw[msg] ([yshift=-5.2cm]iam.south) ++(0.15cm,0) -- ++(0.8,0) -- ++(0,-0.6) node[midway, right=4pt, label, align=left] {5. Sign JWT} -- ++(-0.8,0);
        \draw[reply] ([yshift=-6.5cm]iam.south) -- ([yshift=-6.5cm]api.south) node[midway, above=2pt, label] {6. JWT Valid};
        \draw[reply] ([yshift=-7.5cm]api.south) -- ([yshift=-7.5cm]client.south) node[midway, above=2pt, label] {7. 200 OK (JWT)};
    \end{tikzpicture}"""
text = replace_sd(text, r"SD-01-1.*?", sd01_1)

# SD-01-2
sd01_2 = r"""\begin{tikzpicture}[
        node distance=2cm,
        inst/.style={rectangle, draw=black!90, thick, fill=blue!5, minimum width=2.8cm, minimum height=0.8cm, font=\small\bfseries, rounded corners=2pt},
        act/.style={rectangle, draw=black!90, fill=gray!20, minimum width=0.3cm},
        msg/.style={-Stealth, thick, draw=black!90},
        reply/.style={-Stealth, thick, dashed, draw=black!80},
        label/.style={font=\scriptsize, inner sep=2pt}
    ]
        \node[inst] (client) at (0, 0) {React SPA};
        \node[inst] (api) at (4.5, 0) {API Gateway};
        \node[inst] (iam) at (9, 0) {IAM Module};
        \draw[dashed, draw=black!60, thick] (client.south) -- ++(0, -6);
        \draw[dashed, draw=black!60, thick] (api.south) -- ++(0, -6);
        \draw[dashed, draw=black!60, thick] (iam.south) -- ++(0, -6);
        \draw[act] ([xshift=-0.15cm, yshift=-1.5cm]client.south) rectangle ([xshift=0.15cm, yshift=-5.5cm]client.south);
        \draw[act] ([xshift=-0.15cm, yshift=-1.5cm]api.south) rectangle ([xshift=0.15cm, yshift=-5.5cm]api.south);
        \draw[act] ([xshift=-0.15cm, yshift=-2.5cm]iam.south) rectangle ([xshift=0.15cm, yshift=-3.5cm]iam.south);
        \draw[msg] ([yshift=-1.5cm]client.south) -- ([yshift=-1.5cm]api.south) node[midway, above=2pt, label] {1. POST /login};
        \draw[msg] ([yshift=-2.5cm]api.south) -- ([yshift=-2.5cm]iam.south) node[midway, above=2pt, label] {2. Verify()};
        \draw[reply] ([yshift=-3.5cm]iam.south) -- ([yshift=-3.5cm]api.south) node[midway, above=2pt, label] {3. Hash Mismatch};
        \draw[reply] ([yshift=-5.5cm]api.south) -- ([yshift=-5.5cm]client.south) node[midway, above=2pt, label] {4. 401 Unauthorized};
    \end{tikzpicture}"""
text = replace_sd(text, r"SD-01-2.*?", sd01_2)

# SD-02-1
sd02_1 = r"""\begin{tikzpicture}[
        node distance=2cm,
        inst/.style={rectangle, draw=black!90, thick, fill=blue!5, minimum width=2.8cm, minimum height=0.8cm, font=\small\bfseries, rounded corners=2pt},
        act/.style={rectangle, draw=black!90, fill=gray!20, minimum width=0.3cm},
        msg/.style={-Stealth, thick, draw=black!90},
        reply/.style={-Stealth, thick, dashed, draw=black!80},
        label/.style={font=\scriptsize, inner sep=2pt}
    ]
        \node[inst] (api) at (0, 0) {API Gateway};
        \node[inst] (celery) at (5, 0) {Celery Worker};
        \node[inst] (wazuh) at (10, 0) {Wazuh SIEM};
        \node[inst] (db) at (15, 0) {PostgreSQL};
        \draw[dashed, draw=black!60, thick] (api.south) -- ++(0, -9);
        \draw[dashed, draw=black!60, thick] (celery.south) -- ++(0, -9);
        \draw[dashed, draw=black!60, thick] (wazuh.south) -- ++(0, -9);
        \draw[dashed, draw=black!60, thick] (db.south) -- ++(0, -9);
        \draw[act] ([xshift=-0.15cm, yshift=-1.5cm]api.south) rectangle ([xshift=0.15cm, yshift=-8.5cm]api.south);
        \draw[act] ([xshift=-0.15cm, yshift=-1.5cm]celery.south) rectangle ([xshift=0.15cm, yshift=-8.5cm]celery.south);
        \draw[act] ([xshift=-0.15cm, yshift=-2.5cm]wazuh.south) rectangle ([xshift=0.15cm, yshift=-3.5cm]wazuh.south);
        \draw[act] ([xshift=-0.15cm, yshift=-5.5cm]db.south) rectangle ([xshift=0.15cm, yshift=-6.5cm]db.south);
        \draw[msg] ([yshift=-1.5cm]api.south) -- ([yshift=-1.5cm]celery.south) node[midway, above=2pt, label] {1. GET /sync};
        \draw[msg] ([yshift=-2.5cm]celery.south) -- ([yshift=-2.5cm]wazuh.south) node[midway, above=2pt, label] {2. GET /wazuh/agents};
        \draw[reply] ([yshift=-3.5cm]wazuh.south) -- ([yshift=-3.5cm]celery.south) node[midway, above=2pt, label] {3. 200 OK (JSON)};
        \draw[msg] ([yshift=-4.2cm]celery.south) ++(0.15cm,0) -- ++(0.8,0) -- ++(0,-0.6) node[midway, right=4pt, label, align=left] {4. Map Rules()} -- ++(-0.8,0);
        \draw[msg] ([yshift=-5.5cm]celery.south) -- ([yshift=-5.5cm]db.south) node[midway, above=2pt, label] {5. Commit DB()};
        \draw[reply] ([yshift=-6.5cm]db.south) -- ([yshift=-6.5cm]celery.south) node[midway, above=2pt, label] {6. Commit OK};
        \draw[reply] ([yshift=-8.5cm]celery.south) -- ([yshift=-8.5cm]api.south) node[midway, above=2pt, label] {7. 200 OK};
    \end{tikzpicture}"""
text = replace_sd(text, r"SD-02-1.*?", sd02_1)

# SD-03-1
sd03_1 = r"""\begin{tikzpicture}[
        node distance=2cm,
        inst/.style={rectangle, draw=black!90, thick, fill=blue!5, minimum width=2.8cm, minimum height=0.8cm, font=\small\bfseries, rounded corners=2pt},
        act/.style={rectangle, draw=black!90, fill=gray!20, minimum width=0.3cm},
        msg/.style={-Stealth, thick, draw=black!90},
        reply/.style={-Stealth, thick, dashed, draw=black!80},
        label/.style={font=\scriptsize, inner sep=2pt}
    ]
        \node[inst] (client) at (0, 0) {Admin UI};
        \node[inst] (api) at (4.5, 0) {API Gateway};
        \node[inst] (db) at (9, 0) {PostgreSQL};
        \draw[dashed, draw=black!60, thick] (client.south) -- ++(0, -6.5);
        \draw[dashed, draw=black!60, thick] (api.south) -- ++(0, -6.5);
        \draw[dashed, draw=black!60, thick] (db.south) -- ++(0, -6.5);
        \draw[act] ([xshift=-0.15cm, yshift=-1.5cm]client.south) rectangle ([xshift=0.15cm, yshift=-6cm]client.south);
        \draw[act] ([xshift=-0.15cm, yshift=-1.5cm]api.south) rectangle ([xshift=0.15cm, yshift=-6cm]api.south);
        \draw[act] ([xshift=-0.15cm, yshift=-3.5cm]db.south) rectangle ([xshift=0.15cm, yshift=-4.5cm]db.south);
        \draw[msg] ([yshift=-1.5cm]client.south) -- ([yshift=-1.5cm]api.south) node[midway, above=2pt, label] {1. POST /mappings};
        \draw[msg] ([yshift=-2.2cm]api.south) ++(0.15cm,0) -- ++(0.8,0) -- ++(0,-0.6) node[midway, right=4pt, label, align=left] {2. Validate()} -- ++(-0.8,0);
        \draw[msg] ([yshift=-3.5cm]api.south) -- ([yshift=-3.5cm]db.south) node[midway, above=2pt, label] {3. Assign to Dept \& Save()};
        \draw[reply] ([yshift=-4.5cm]db.south) -- ([yshift=-4.5cm]api.south) node[midway, above=2pt, label] {4. Commit OK};
        \draw[reply] ([yshift=-6cm]api.south) -- ([yshift=-6cm]client.south) node[midway, above=2pt, label] {5. 201 Created};
    \end{tikzpicture}"""
text = replace_sd(text, r"SD-03-1.*?", sd03_1)

# SD-03-2
sd03_2 = r"""\begin{tikzpicture}[
        node distance=2cm,
        inst/.style={rectangle, draw=black!90, thick, fill=blue!5, minimum width=2.8cm, minimum height=0.8cm, font=\small\bfseries, rounded corners=2pt},
        act/.style={rectangle, draw=black!90, fill=gray!20, minimum width=0.3cm},
        msg/.style={-Stealth, thick, draw=black!90},
        reply/.style={-Stealth, thick, dashed, draw=black!80},
        label/.style={font=\scriptsize, inner sep=2pt}
    ]
        \node[inst] (client) at (0, 0) {Admin UI};
        \node[inst] (api) at (4.5, 0) {API Gateway};
        \draw[dashed, draw=black!60, thick] (client.south) -- ++(0, -6);
        \draw[dashed, draw=black!60, thick] (api.south) -- ++(0, -6);
        \draw[act] ([xshift=-0.15cm, yshift=-1.5cm]client.south) rectangle ([xshift=0.15cm, yshift=-5.5cm]client.south);
        \draw[act] ([xshift=-0.15cm, yshift=-1.5cm]api.south) rectangle ([xshift=0.15cm, yshift=-5.5cm]api.south);
        \draw[msg] ([yshift=-1.5cm]client.south) -- ([yshift=-1.5cm]api.south) node[midway, above=2pt, label] {1. POST /mappings};
        \draw[msg] ([yshift=-2.2cm]api.south) ++(0.15cm,0) -- ++(0.8,0) -- ++(0,-0.6) node[midway, right=4pt, label, align=left] {2. Validate()} -- ++(-0.8,0);
        \draw[msg] ([yshift=-3.5cm]api.south) ++(0.15cm,0) -- ++(0.8,0) -- ++(0,-0.6) node[midway, right=4pt, label, align=left] {3. Duplicate Found()} -- ++(-0.8,0);
        \draw[reply] ([yshift=-5.5cm]api.south) -- ([yshift=-5.5cm]client.south) node[midway, above=2pt, label] {4. 400 Bad Request};
    \end{tikzpicture}"""
text = replace_sd(text, r"SD-03-2.*?", sd03_2)

# SD-04-1
sd04_1 = r"""\begin{tikzpicture}[
        node distance=2cm,
        inst/.style={rectangle, draw=black!90, thick, fill=blue!5, minimum width=2.8cm, minimum height=0.8cm, font=\small\bfseries, rounded corners=2pt},
        act/.style={rectangle, draw=black!90, fill=gray!20, minimum width=0.3cm},
        msg/.style={-Stealth, thick, draw=black!90},
        reply/.style={-Stealth, thick, dashed, draw=black!80},
        label/.style={font=\scriptsize, inner sep=2pt}
    ]
        \node[inst] (client) at (0, 0) {React SPA};
        \node[inst] (api) at (5, 0) {API Gateway};
        \node[inst] (db) at (10, 0) {PostgreSQL};
        \draw[dashed, draw=black!60, thick] (client.south) -- ++(0, -6.5);
        \draw[dashed, draw=black!60, thick] (api.south) -- ++(0, -6.5);
        \draw[dashed, draw=black!60, thick] (db.south) -- ++(0, -6.5);
        \draw[act] ([xshift=-0.15cm, yshift=-1.5cm]client.south) rectangle ([xshift=0.15cm, yshift=-6cm]client.south);
        \draw[act] ([xshift=-0.15cm, yshift=-1.5cm]api.south) rectangle ([xshift=0.15cm, yshift=-6cm]api.south);
        \draw[act] ([xshift=-0.15cm, yshift=-2.5cm]db.south) rectangle ([xshift=0.15cm, yshift=-4.5cm]db.south);
        \draw[msg] ([yshift=-1.5cm]client.south) -- ([yshift=-1.5cm]api.south) node[midway, above=2pt, label] {1. GET /api/compliance?dept\_id=X};
        \draw[msg] ([yshift=-2.5cm]api.south) -- ([yshift=-2.5cm]db.south) node[midway, above=2pt, label] {2. Query Metrics by Dept()};
        \draw[reply] ([yshift=-4.5cm]db.south) -- ([yshift=-4.5cm]api.south) node[midway, above=2pt, label] {3. Return Data Array};
        \draw[reply] ([yshift=-6cm]api.south) -- ([yshift=-6cm]client.south) node[midway, above=2pt, label] {4. 200 OK};
    \end{tikzpicture}"""
text = replace_sd(text, r"SD-04-1.*?", sd04_1)

# SD-05-1
sd05_1 = r"""\begin{tikzpicture}[
        node distance=2cm,
        inst/.style={rectangle, draw=black!90, thick, fill=blue!5, minimum width=2.8cm, minimum height=0.8cm, font=\small\bfseries, rounded corners=2pt},
        act/.style={rectangle, draw=black!90, fill=gray!20, minimum width=0.3cm},
        msg/.style={-Stealth, thick, draw=black!90},
        reply/.style={-Stealth, thick, dashed, draw=black!80},
        label/.style={font=\scriptsize, inner sep=2pt}
    ]
        \node[inst] (client) at (0, 0) {Admin UI};
        \node[inst] (api) at (4.5, 0) {API Gateway};
        \node[inst] (celery) at (9, 0) {Celery Worker};
        \node[inst] (db) at (13.5, 0) {PostgreSQL};
        \draw[dashed, draw=black!60, thick] (client.south) -- ++(0, -8);
        \draw[dashed, draw=black!60, thick] (api.south) -- ++(0, -8);
        \draw[dashed, draw=black!60, thick] (celery.south) -- ++(0, -8);
        \draw[dashed, draw=black!60, thick] (db.south) -- ++(0, -8);
        \draw[act] ([xshift=-0.15cm, yshift=-1.5cm]client.south) rectangle ([xshift=0.15cm, yshift=-7.5cm]client.south);
        \draw[act] ([xshift=-0.15cm, yshift=-1.5cm]api.south) rectangle ([xshift=0.15cm, yshift=-7.5cm]api.south);
        \draw[act] ([xshift=-0.15cm, yshift=-2.5cm]celery.south) rectangle ([xshift=0.15cm, yshift=-6.5cm]celery.south);
        \draw[act] ([xshift=-0.15cm, yshift=-3.5cm]db.south) rectangle ([xshift=0.15cm, yshift=-4.5cm]db.south);
        \draw[msg] ([yshift=-1.5cm]client.south) -- ([yshift=-1.5cm]api.south) node[midway, above=2pt, label] {1. POST /api/remediate};
        \draw[msg] ([yshift=-2.5cm]api.south) -- ([yshift=-2.5cm]celery.south) node[midway, above=2pt, label] {2. Dispatch Remediation Task()};
        \draw[msg] ([yshift=-3.5cm]celery.south) -- ([yshift=-3.5cm]db.south) node[midway, above=2pt, label] {3. Update Control Status()};
        \draw[reply] ([yshift=-4.5cm]db.south) -- ([yshift=-4.5cm]celery.south) node[midway, above=2pt, label] {4. Commit OK};
        \draw[reply] ([yshift=-6.5cm]celery.south) -- ([yshift=-6.5cm]api.south) node[midway, above=2pt, label] {5. Task Complete};
        \draw[reply] ([yshift=-7.5cm]api.south) -- ([yshift=-7.5cm]client.south) node[midway, above=2pt, label] {6. 200 OK};
    \end{tikzpicture}"""
text = replace_sd(text, r"SD-05-1.*?", sd05_1)

# SD-06-1
sd06_1 = r"""\begin{tikzpicture}[
        node distance=2cm,
        inst/.style={rectangle, draw=black!90, thick, fill=blue!5, minimum width=2.8cm, minimum height=0.8cm, font=\small\bfseries, rounded corners=2pt},
        act/.style={rectangle, draw=black!90, fill=gray!20, minimum width=0.3cm},
        msg/.style={-Stealth, thick, draw=black!90},
        reply/.style={-Stealth, thick, dashed, draw=black!80},
        label/.style={font=\scriptsize, inner sep=2pt}
    ]
        \node[inst] (client) at (0, 0) {Auditor UI};
        \node[inst] (api) at (4.5, 0) {API Gateway};
        \node[inst] (db) at (9, 0) {PostgreSQL};
        \draw[dashed, draw=black!60, thick] (client.south) -- ++(0, -8);
        \draw[dashed, draw=black!60, thick] (api.south) -- ++(0, -8);
        \draw[dashed, draw=black!60, thick] (db.south) -- ++(0, -8);
        \draw[act] ([xshift=-0.15cm, yshift=-1.5cm]client.south) rectangle ([xshift=0.15cm, yshift=-7.5cm]client.south);
        \draw[act] ([xshift=-0.15cm, yshift=-1.5cm]api.south) rectangle ([xshift=0.15cm, yshift=-7.5cm]api.south);
        \draw[act] ([xshift=-0.15cm, yshift=-2.5cm]db.south) rectangle ([xshift=0.15cm, yshift=-3.5cm]db.south);
        \draw[msg] ([yshift=-1.5cm]client.south) -- ([yshift=-1.5cm]api.south) node[midway, above=2pt, label] {1. GET /reports/pdf?dept\_id=X};
        \draw[msg] ([yshift=-2.5cm]api.south) -- ([yshift=-2.5cm]db.south) node[midway, above=2pt, label] {2. Query Dept Data()};
        \draw[reply] ([yshift=-3.5cm]db.south) -- ([yshift=-3.5cm]api.south) node[midway, above=2pt, label] {3. Return Data Array};
        \draw[msg] ([yshift=-4.5cm]api.south) ++(0.15cm,0) -- ++(0.8,0) -- ++(0,-0.6) node[midway, right=4pt, label, align=left] {4. Render PDF()} -- ++(-0.8,0);
        \draw[reply] ([yshift=-7.5cm]api.south) -- ([yshift=-7.5cm]client.south) node[midway, above=2pt, label] {5. 200 OK (Binary Stream)};
    \end{tikzpicture}"""
text = replace_sd(text, r"SD-06-1.*?", sd06_1)

with open(r"c:\Users\malib\Documents\fyp\New Project FYP\Project Report Thesis\ICMS_Official_Thesis\chapter4.tex", "w", encoding="utf-8") as f:
    f.write(text)
