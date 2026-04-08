import { useMemo, useState } from 'react'
import './App.css'

const DB_KEYS = {
  leads: 'lc_leads',
  rules: 'lc_rules',
  queries: 'lc_queries',
  wati: 'lc_wati',
}

const DEFAULT_LEADS = [
  {
    id: 'ld_1',
    name: 'Arun K',
    phone: '919876543210',
    source: 'Purchased',
    category: 'Automotive',
    status: 'New',
    score: 68,
    premium: 640,
    followUpAt: Date.now() + 1000 * 60 * 60 * 3,
    notes: 'Requested call after 6 PM',
  },
  {
    id: 'ld_2',
    name: 'Priya S',
    phone: '919845612345',
    source: 'Purchased',
    category: 'Health',
    status: 'Follow-up',
    score: 82,
    premium: 930,
    followUpAt: Date.now() - 1000 * 60 * 40,
    notes: 'Asked for family plan',
  },
  {
    id: 'ld_3',
    name: 'Naveen R',
    phone: '919700001122',
    source: 'Purchased',
    category: 'Education',
    status: 'Qualified',
    score: 89,
    premium: 1180,
    followUpAt: Date.now() + 1000 * 60 * 90,
    notes: 'High intent lead',
  },
  {
    id: 'ld_4',
    name: 'Divya M',
    phone: '918888777666',
    source: 'Purchased',
    category: 'Automotive',
    status: 'Converted',
    score: 91,
    premium: 1540,
    followUpAt: Date.now() - 1000 * 60 * 60 * 24,
    notes: 'Paid first premium',
  },
  {
    id: 'ld_5',
    name: 'Farook A',
    phone: '919766554433',
    source: 'Purchased',
    category: 'Business',
    status: 'No Response',
    score: 42,
    premium: 720,
    followUpAt: Date.now() - 1000 * 60 * 60 * 2,
    notes: 'No response after 2 attempts',
  },
]

const DEFAULT_RULES = [
  {
    id: 'rule_1',
    name: 'Auto-priority for high score',
    when: 'score >= 80',
    then: 'Mark as High Priority',
  },
  {
    id: 'rule_2',
    name: 'Escalate unattended follow-up',
    when: 'follow-up overdue > 2h',
    then: 'Add to Needs Attention',
  },
]

const DEFAULT_QUERIES = [
  {
    id: 'q_1',
    leadId: 'ld_2',
    question: 'Can I include spouse and child in one policy?',
    createdAt: Date.now() - 1000 * 60 * 18,
    priority: 'High',
    answered: false,
  },
  {
    id: 'q_2',
    leadId: 'ld_3',
    question: 'What is the waiting period for claims?',
    createdAt: Date.now() - 1000 * 60 * 55,
    priority: 'Normal',
    answered: false,
  },
]

const DEFAULT_WATI = {
  baseUrl: '',
  endpoint: '/api/v1/sendTemplateMessage',
  apiToken: '',
  templateName: 'promo_reel_campaign',
}

function loadState(key, fallback) {
  try {
    const raw = localStorage.getItem(key)
    if (!raw) return fallback
    const parsed = JSON.parse(raw)
    return parsed ?? fallback
  } catch {
    return fallback
  }
}

function saveState(key, value) {
  localStorage.setItem(key, JSON.stringify(value))
}

function seed() {
  if (!localStorage.getItem(DB_KEYS.leads)) {
    saveState(DB_KEYS.leads, DEFAULT_LEADS)
  }
  if (!localStorage.getItem(DB_KEYS.rules)) {
    saveState(DB_KEYS.rules, DEFAULT_RULES)
  }
  if (!localStorage.getItem(DB_KEYS.queries)) {
    saveState(DB_KEYS.queries, DEFAULT_QUERIES)
  }
  if (!localStorage.getItem(DB_KEYS.wati)) {
    saveState(DB_KEYS.wati, DEFAULT_WATI)
  }
}

seed()

function formatTime(ts) {
  return new Date(ts).toLocaleString('en-IN', {
    day: '2-digit',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit',
  })
}

function calcPremium(age, coverage, risk) {
  const riskFactor = risk === 'high' ? 1.35 : risk === 'medium' ? 1.1 : 0.95
  const ageFactor = age >= 50 ? 1.4 : age >= 35 ? 1.15 : 1
  return Math.round((coverage / 1000) * 42 * riskFactor * ageFactor)
}

function normalizeStatus(status) {
  const raw = String(status || '').trim().toLowerCase()
  if (raw === 'followup' || raw === 'follow-up') return 'Follow-up'
  if (raw === 'qualified') return 'Qualified'
  if (raw === 'converted') return 'Converted'
  if (raw === 'no response' || raw === 'no-response') return 'No Response'
  return 'New'
}

function parseCsv(text) {
  const lines = text
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean)

  if (lines.length < 2) return []
  const headers = lines[0].split(',').map((h) => h.trim().toLowerCase())

  return lines.slice(1).map((line) => {
    const cols = line.split(',').map((c) => c.trim())
    const row = {}
    headers.forEach((key, index) => {
      row[key] = cols[index] || ''
    })
    return row
  })
}

function App() {
  const [activeTab, setActiveTab] = useState('dashboard')
  const [leads, setLeads] = useState(() => loadState(DB_KEYS.leads, DEFAULT_LEADS))
  const [rules, setRules] = useState(() => loadState(DB_KEYS.rules, DEFAULT_RULES))
  const [queries, setQueries] = useState(() => loadState(DB_KEYS.queries, DEFAULT_QUERIES))
  const [wati, setWati] = useState(() => loadState(DB_KEYS.wati, DEFAULT_WATI))
  const [selectedCategory, setSelectedCategory] = useState('All')
  const [campaignMessage, setCampaignMessage] = useState('Hi {{name}}, sharing a quick reel selected for your category. Reply YES to connect now.')
  const [log, setLog] = useState('')

  const [newLead, setNewLead] = useState({
    name: '',
    phone: '',
    category: 'Automotive',
    status: 'New',
  })

  const [premiumInput, setPremiumInput] = useState({ age: 30, coverage: 500000, risk: 'low' })
  const [premiumQuery, setPremiumQuery] = useState('What will be premium for age 42 and coverage 12 lakh at medium risk?')

  const categories = useMemo(() => {
    const all = new Set(leads.map((lead) => lead.category))
    return ['All', ...Array.from(all)]
  }, [leads])

  const leadsByStatus = useMemo(() => {
    const bucket = { New: 0, 'Follow-up': 0, Qualified: 0, Converted: 0, 'No Response': 0 }
    for (const lead of leads) {
      if (bucket[lead.status] !== undefined) bucket[lead.status] += 1
    }
    return bucket
  }, [leads])

  const attentionItems = useMemo(() => {
    return leads
      .filter((lead) => lead.status === 'Follow-up' || lead.status === 'No Response')
      .sort((a, b) => a.followUpAt - b.followUpAt)
  }, [leads])

  const filteredLeads = useMemo(() => {
    if (selectedCategory === 'All') return leads
    return leads.filter((lead) => lead.category === selectedCategory)
  }, [leads, selectedCategory])

  const campaignTargets = useMemo(() => {
    return filteredLeads.filter((lead) => lead.status !== 'Converted' && lead.phone)
  }, [filteredLeads])

  const stats = useMemo(() => {
    return {
      total: leads.length,
      converted: leads.filter((lead) => lead.status === 'Converted').length,
      purchased: leads.filter((lead) => lead.source === 'Purchased').length,
      openQueries: queries.filter((query) => !query.answered).length,
    }
  }, [leads, queries])

  function persistLeads(next) {
    setLeads(next)
    saveState(DB_KEYS.leads, next)
  }

  function persistRules(next) {
    setRules(next)
    saveState(DB_KEYS.rules, next)
  }

  function persistQueries(next) {
    setQueries(next)
    saveState(DB_KEYS.queries, next)
  }

  function persistWati(next) {
    setWati(next)
    saveState(DB_KEYS.wati, next)
  }

  function addLead(event) {
    event.preventDefault()
    if (!newLead.name.trim() || !newLead.phone.trim()) return

    const lead = {
      id: 'ld_' + Date.now().toString(36),
      name: newLead.name.trim(),
      phone: newLead.phone.trim(),
      category: newLead.category,
      status: newLead.status,
      source: 'Purchased',
      score: 60,
      premium: 0,
      followUpAt: Date.now() + 1000 * 60 * 60 * 4,
      notes: '',
    }

    persistLeads([lead, ...leads])
    setNewLead({ name: '', phone: '', category: newLead.category, status: 'New' })
  }

  async function importMembers(event) {
    const file = event.target.files?.[0]
    if (!file) return

    try {
      const raw = await file.text()
      const isJson = file.name.toLowerCase().endsWith('.json')
      const rows = isJson ? JSON.parse(raw) : parseCsv(raw)

      if (!Array.isArray(rows) || rows.length === 0) {
        setLog('Import failed: file is empty or invalid.')
        event.target.value = ''
        return
      }

      const mapped = rows
        .map((row) => {
          const name = row.name || row.fullname || row.membername || ''
          const phone = row.phone || row.whatsapp || row.mobile || ''
          if (!name || !phone) return null

          const category = row.category || 'General'
          const status = normalizeStatus(row.status)
          const score = Number(row.score || 60)

          return {
            id: 'ld_' + Date.now().toString(36) + Math.random().toString(36).slice(2, 5),
            name: String(name).trim(),
            phone: String(phone).replace(/\s+/g, ''),
            category: String(category).trim(),
            status,
            source: 'Purchased',
            score: Number.isFinite(score) ? score : 60,
            premium: Number(row.premium || 0) || 0,
            followUpAt: Date.now() + 1000 * 60 * 60 * 4,
            notes: String(row.notes || ''),
          }
        })
        .filter(Boolean)

      if (!mapped.length) {
        setLog('Import failed: no valid rows found. Required fields: name and phone.')
        event.target.value = ''
        return
      }

      const next = [...mapped, ...leads]
      persistLeads(next)
      setLog(`Imported ${mapped.length} members from ${file.name}.`)
    } catch {
      setLog('Import failed: unsupported file format. Use CSV or JSON.')
    }

    event.target.value = ''
  }

  function moveLeadStatus(id, status) {
    const next = leads.map((lead) => (lead.id === id ? { ...lead, status } : lead))
    persistLeads(next)
  }

  function answerQuery(id) {
    const next = queries.map((query) => (query.id === id ? { ...query, answered: true } : query))
    persistQueries(next)
  }

  function addRule(event) {
    event.preventDefault()
    const form = new FormData(event.currentTarget)
    const name = String(form.get('name') || '').trim()
    const when = String(form.get('when') || '').trim()
    const then = String(form.get('then') || '').trim()
    if (!name || !when || !then) return

    const next = [{ id: 'rule_' + Date.now().toString(36), name, when, then }, ...rules]
    persistRules(next)
    event.currentTarget.reset()
  }

  function removeRule(id) {
    persistRules(rules.filter((rule) => rule.id !== id))
  }

  async function sendCampaign() {
    if (!wati.baseUrl || !wati.apiToken) {
      setLog('Configure WATI Base URL and API token before sending.')
      return
    }

    if (!campaignTargets.length) {
      setLog('No leads available for this category campaign.')
      return
    }

    const url = wati.baseUrl.replace(/\/$/, '') + wati.endpoint
    let sent = 0
    let failed = 0

    for (const lead of campaignTargets) {
      const body = {
        whatsappNumber: lead.phone,
        templateName: wati.templateName,
        broadcastName: 'lead-category-campaign',
        customParams: [
          { name: 'name', value: lead.name },
          { name: 'category', value: lead.category },
          { name: 'message', value: campaignMessage.replace('{{name}}', lead.name) },
        ],
      }

      try {
        const response = await fetch(url, {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${wati.apiToken}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(body),
        })

        if (!response.ok) {
          failed += 1
        } else {
          sent += 1
        }
      } catch {
        failed += 1
      }
    }

    setLog(`Campaign completed. Sent: ${sent}, Failed: ${failed}.`)
  }

  const premiumResult = calcPremium(
    Number(premiumInput.age),
    Number(premiumInput.coverage),
    premiumInput.risk,
  )

  function answerPremiumQuery() {
    const ageMatch = premiumQuery.match(/age\s*(\d+)/i)
    const coverageMatch = premiumQuery.match(/(\d+)\s*lakh/i)
    const risk = /high/i.test(premiumQuery)
      ? 'high'
      : /medium/i.test(premiumQuery)
        ? 'medium'
        : 'low'

    const age = ageMatch ? Number(ageMatch[1]) : 30
    const coverage = coverageMatch ? Number(coverageMatch[1]) * 100000 : 500000
    const result = calcPremium(age, coverage, risk)
    setLog(
      `Premium query answered: Approx monthly premium for age ${age}, coverage Rs.${coverage.toLocaleString('en-IN')}, ${risk} risk is Rs.${result}.`,
    )
  }

  return (
    <div className="app-shell">
      <header className="topbar">
        <div>
          <p className="brand">Lead Workspace</p>
          <h1>CRM Dashboard</h1>
        </div>
        <div className="stat-inline">
          <span>{stats.total} leads</span>
          <span>{stats.converted} converted</span>
          <span>{stats.purchased} purchased</span>
        </div>
      </header>

      <nav className="tabs">
        {[
          ['dashboard', 'Dashboard'],
          ['leads', 'Lead Follow-up'],
          ['queries', 'Queries'],
          ['crm', 'Data / CRM'],
          ['premium', 'Premium Calculator'],
          ['rules', 'Rules'],
          ['campaigns', 'Reel Campaigns'],
        ].map(([value, label]) => (
          <button
            key={value}
            className={activeTab === value ? 'tab active' : 'tab'}
            onClick={() => setActiveTab(value)}
            type="button"
          >
            {label}
          </button>
        ))}
      </nav>

      <main className="board">
        {activeTab === 'dashboard' && (
          <section className="panel-grid fade-in">
            <article className="panel stats">
              <h2>Lead Status</h2>
              <div className="status-grid">
                {Object.entries(leadsByStatus).map(([status, count]) => (
                  <div key={status} className="status-card">
                    <p>{status}</p>
                    <strong>{count}</strong>
                  </div>
                ))}
              </div>
            </article>

            <article className="panel">
              <h2>Needs Attention</h2>
              {attentionItems.length === 0 && <p className="muted">No overdue follow-ups right now.</p>}
              {attentionItems.map((lead) => (
                <div key={lead.id} className="row">
                  <div>
                    <strong>{lead.name}</strong>
                    <p className="muted">{lead.category} | overdue since {formatTime(lead.followUpAt)}</p>
                  </div>
                  <button type="button" className="btn" onClick={() => moveLeadStatus(lead.id, 'Follow-up')}>
                    Follow-up
                  </button>
                </div>
              ))}
            </article>

            <article className="panel">
              <h2>Open Queries</h2>
              <p className="muted">{stats.openQueries} query items are waiting for answer.</p>
              {queries
                .filter((query) => !query.answered)
                .slice(0, 4)
                .map((query) => {
                  const lead = leads.find((item) => item.id === query.leadId)
                  return (
                    <div key={query.id} className="query">
                      <p>{query.question}</p>
                      <small>
                        {lead?.name || 'Unknown lead'} | {query.priority}
                      </small>
                    </div>
                  )
                })}
            </article>
          </section>
        )}

        {activeTab === 'leads' && (
          <section className="panel-grid two fade-in">
            <article className="panel">
              <h2>Add Purchased Lead</h2>
              <div className="import-wrap">
                <label htmlFor="member-file" className="btn">
                  Import Member Data (CSV/JSON)
                </label>
                <input
                  id="member-file"
                  type="file"
                  accept=".csv,.json"
                  className="hidden-input"
                  onChange={importMembers}
                />
                <p className="muted">CSV headers: name, phone, category, status, score, premium</p>
              </div>
              <form onSubmit={addLead} className="stack">
                <input
                  value={newLead.name}
                  onChange={(event) => setNewLead({ ...newLead, name: event.target.value })}
                  placeholder="Name"
                />
                <input
                  value={newLead.phone}
                  onChange={(event) => setNewLead({ ...newLead, phone: event.target.value })}
                  placeholder="WhatsApp Number"
                />
                <select
                  value={newLead.category}
                  onChange={(event) => setNewLead({ ...newLead, category: event.target.value })}
                >
                  <option>Automotive</option>
                  <option>Health</option>
                  <option>Education</option>
                  <option>Business</option>
                </select>
                <select
                  value={newLead.status}
                  onChange={(event) => setNewLead({ ...newLead, status: event.target.value })}
                >
                  <option>New</option>
                  <option>Follow-up</option>
                  <option>Qualified</option>
                  <option>No Response</option>
                </select>
                <button type="submit" className="btn primary">
                  Save Lead
                </button>
              </form>
            </article>

            <article className="panel">
              <h2>Lead Pipeline</h2>
              <div className="table-wrap">
                <table>
                  <thead>
                    <tr>
                      <th>Name</th>
                      <th>Category</th>
                      <th>Status</th>
                      <th>Action</th>
                    </tr>
                  </thead>
                  <tbody>
                    {leads.map((lead) => (
                      <tr key={lead.id}>
                        <td>
                          <strong>{lead.name}</strong>
                          <p className="muted">{lead.phone}</p>
                        </td>
                        <td>{lead.category}</td>
                        <td>
                          <span className={`badge ${lead.status.toLowerCase().replace(/\s+/g, '-')}`}>
                            {lead.status}
                          </span>
                        </td>
                        <td>
                          <select
                            value={lead.status}
                            onChange={(event) => moveLeadStatus(lead.id, event.target.value)}
                          >
                            <option>New</option>
                            <option>Follow-up</option>
                            <option>Qualified</option>
                            <option>Converted</option>
                            <option>No Response</option>
                          </select>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </article>
          </section>
        )}

        {activeTab === 'queries' && (
          <section className="panel fade-in">
            <h2>Lead Query Desk</h2>
            <p className="muted">Answer quickly and keep high-priority buyers moving.</p>
            {queries.map((query) => {
              const lead = leads.find((item) => item.id === query.leadId)
              return (
                <div key={query.id} className="row query-row">
                  <div>
                    <strong>{lead?.name || 'Unknown lead'}</strong>
                    <p>{query.question}</p>
                    <small className="muted">{query.priority} priority | {formatTime(query.createdAt)}</small>
                  </div>
                  {query.answered ? (
                    <span className="badge converted">Answered</span>
                  ) : (
                    <button type="button" className="btn" onClick={() => answerQuery(query.id)}>
                      Mark Answered
                    </button>
                  )}
                </div>
              )
            })}
          </section>
        )}

        {activeTab === 'crm' && (
          <section className="panel-grid two fade-in">
            <article className="panel">
              <h2>Category CRM</h2>
              <label className="label">Select Category</label>
              <select value={selectedCategory} onChange={(event) => setSelectedCategory(event.target.value)}>
                {categories.map((category) => (
                  <option key={category}>{category}</option>
                ))}
              </select>
              <p className="muted">Filtered leads: {filteredLeads.length}</p>
              <div className="chips">
                {categories.map((category) => (
                  <button
                    key={category}
                    type="button"
                    className={selectedCategory === category ? 'chip active' : 'chip'}
                    onClick={() => setSelectedCategory(category)}
                  >
                    {category}
                  </button>
                ))}
              </div>
            </article>
            <article className="panel">
              <h2>Lead Data Board</h2>
              {filteredLeads.map((lead) => (
                <div className="row" key={lead.id}>
                  <div>
                    <strong>{lead.name}</strong>
                    <p className="muted">{lead.phone} | score {lead.score}</p>
                  </div>
                  <span className="mono">Rs.{lead.premium}</span>
                </div>
              ))}
            </article>
          </section>
        )}

        {activeTab === 'premium' && (
          <section className="panel-grid two fade-in">
            <article className="panel">
              <h2>Premium Calculator</h2>
              <div className="stack">
                <label className="label">Age</label>
                <input
                  type="number"
                  value={premiumInput.age}
                  onChange={(event) => setPremiumInput({ ...premiumInput, age: event.target.value })}
                />
                <label className="label">Coverage (Rs.)</label>
                <input
                  type="number"
                  value={premiumInput.coverage}
                  onChange={(event) => setPremiumInput({ ...premiumInput, coverage: event.target.value })}
                />
                <label className="label">Risk</label>
                <select
                  value={premiumInput.risk}
                  onChange={(event) => setPremiumInput({ ...premiumInput, risk: event.target.value })}
                >
                  <option value="low">Low</option>
                  <option value="medium">Medium</option>
                  <option value="high">High</option>
                </select>
                <div className="result-box">Estimated Monthly Premium: Rs.{premiumResult}</div>
              </div>
            </article>

            <article className="panel">
              <h2>Premium Query Answer</h2>
              <textarea
                rows={5}
                value={premiumQuery}
                onChange={(event) => setPremiumQuery(event.target.value)}
              />
              <button type="button" className="btn primary" onClick={answerPremiumQuery}>
                Answer Query
              </button>
              <p className="muted">This reads simple age/coverage/risk terms and returns an instant estimate.</p>
            </article>
          </section>
        )}

        {activeTab === 'rules' && (
          <section className="panel-grid two fade-in">
            <article className="panel">
              <h2>Add Rule</h2>
              <form className="stack" onSubmit={addRule}>
                <input name="name" placeholder="Rule name" />
                <input name="when" placeholder="Condition, e.g. score >= 80" />
                <input name="then" placeholder="Action, e.g. escalate to owner" />
                <button className="btn primary" type="submit">
                  Save Rule
                </button>
              </form>
            </article>

            <article className="panel">
              <h2>Rules Management</h2>
              {rules.map((rule) => (
                <div className="rule" key={rule.id}>
                  <div>
                    <strong>{rule.name}</strong>
                    <p className="muted">If {rule.when}</p>
                    <p className="muted">Then {rule.then}</p>
                  </div>
                  <button className="btn danger" type="button" onClick={() => removeRule(rule.id)}>
                    Remove
                  </button>
                </div>
              ))}
            </article>
          </section>
        )}

        {activeTab === 'campaigns' && (
          <section className="panel-grid two fade-in">
            <article className="panel">
              <h2>Share Reels by Category</h2>
              <label className="label">Category</label>
              <select value={selectedCategory} onChange={(event) => setSelectedCategory(event.target.value)}>
                {categories.map((category) => (
                  <option key={category}>{category}</option>
                ))}
              </select>
              <label className="label">Campaign Message</label>
              <textarea
                rows={4}
                value={campaignMessage}
                onChange={(event) => setCampaignMessage(event.target.value)}
              />
              <p className="muted">Targets: {campaignTargets.length} leads from selected category.</p>
              <button className="btn primary" type="button" onClick={sendCampaign}>
                Send WhatsApp Campaign (WATI)
              </button>
            </article>

            <article className="panel">
              <h2>WATI Integration</h2>
              <div className="stack">
                <label className="label">Base URL</label>
                <input
                  value={wati.baseUrl}
                  onChange={(event) => persistWati({ ...wati, baseUrl: event.target.value })}
                  placeholder="https://live-server-xxxxx.wati.io"
                />
                <label className="label">Endpoint</label>
                <input
                  value={wati.endpoint}
                  onChange={(event) => persistWati({ ...wati, endpoint: event.target.value })}
                  placeholder="/api/v1/sendTemplateMessage"
                />
                <label className="label">API Token</label>
                <input
                  type="password"
                  value={wati.apiToken}
                  onChange={(event) => persistWati({ ...wati, apiToken: event.target.value })}
                  placeholder="WATI bearer token"
                />
                <label className="label">Template Name</label>
                <input
                  value={wati.templateName}
                  onChange={(event) => persistWati({ ...wati, templateName: event.target.value })}
                />
              </div>
              <p className="muted">
                Configure approved template in WATI. This dashboard sends one API request per selected lead.
              </p>
            </article>
          </section>
        )}
      </main>

      <footer className="console">
        <strong>Assistant Output</strong>
        <p>{log || 'No actions yet. Use modules above to manage leads, answer queries, and run campaigns.'}</p>
      </footer>
    </div>
  )
}

export default App
