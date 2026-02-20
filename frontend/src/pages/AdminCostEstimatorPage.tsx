import { useState, useEffect, useMemo } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { usePageTitle } from '../hooks/usePageTitle';
import './AdminCostEstimatorPage.css';

// ---------------------------------------------------------------------------
// SliderInput helper
// ---------------------------------------------------------------------------

interface SliderInputProps {
  label: string;
  value: number;
  min: number;
  max: number;
  step: number;
  onChange: (v: number) => void;
  suffix?: string;
}

function SliderInput({ label, value, min, max, step, onChange, suffix }: SliderInputProps) {
  return (
    <div className="slider-input">
      <div className="slider-input-header">
        <span className="slider-input-label">{label}</span>
        <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
          <input
            className="slider-input-value"
            type="number"
            value={value}
            min={min}
            max={max}
            step={step}
            onChange={(e) => {
              const v = parseFloat(e.target.value);
              if (!isNaN(v)) onChange(Math.min(max, Math.max(min, v)));
            }}
          />
          {suffix && <span style={{ fontSize: 'var(--font-size-xs)', color: 'var(--color-primary-500)' }}>{suffix}</span>}
        </div>
      </div>
      <input
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={(e) => onChange(parseFloat(e.target.value))}
      />
    </div>
  );
}

// ---------------------------------------------------------------------------
// Defaults
// ---------------------------------------------------------------------------

const DEFAULTS = {
  // Primary
  activeUsers: 100,
  convsPerUser: 2,
  responsesPerConv: 15,
  textQuestionsPerConv: 3,
  // Advanced
  clustersPerQuestion: 3,
  nonTextQuestions: 2,
  pctSuggestedActions: 60,
  pctQuestionSuggestions: 30,
  journalsPerUser: 0.5,
  entriesPerJournal: 8,
  journalAnalysisFreq: 2,
  numCollections: 5,
  collectionAnalysesPerMonth: 2,
  // Pricing
  sonnetInputPer1M: 3,
  sonnetOutputPer1M: 15,
  embeddingPer1M: 0.02,
  avgTokensPerResponse: 75,
};

// ---------------------------------------------------------------------------
// Operation definitions (token profiles)
// ---------------------------------------------------------------------------

interface OperationResult {
  name: string;
  provider: 'anthropic' | 'openai';
  calls: number;
  inputTokens: number;
  outputTokens: number;
}

// ---------------------------------------------------------------------------
// Main Page
// ---------------------------------------------------------------------------

export default function AdminCostEstimatorPage() {
  usePageTitle('Cost Estimator - Admin');
  const navigate = useNavigate();

  // Auth check
  useEffect(() => {
    const adminToken = localStorage.getItem('admin_token');
    if (!adminToken) {
      navigate('/adminportal');
    }
  }, [navigate]);

  // Collapsible sections
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [showPricing, setShowPricing] = useState(false);

  // Primary inputs
  const [activeUsers, setActiveUsers] = useState(DEFAULTS.activeUsers);
  const [convsPerUser, setConvsPerUser] = useState(DEFAULTS.convsPerUser);
  const [responsesPerConv, setResponsesPerConv] = useState(DEFAULTS.responsesPerConv);
  const [textQuestionsPerConv, setTextQuestionsPerConv] = useState(DEFAULTS.textQuestionsPerConv);

  // Advanced inputs
  const [clustersPerQuestion, setClustersPerQuestion] = useState(DEFAULTS.clustersPerQuestion);
  const [nonTextQuestions, setNonTextQuestions] = useState(DEFAULTS.nonTextQuestions);
  const [pctSuggestedActions, setPctSuggestedActions] = useState(DEFAULTS.pctSuggestedActions);
  const [pctQuestionSuggestions, setPctQuestionSuggestions] = useState(DEFAULTS.pctQuestionSuggestions);
  const [journalsPerUser, setJournalsPerUser] = useState(DEFAULTS.journalsPerUser);
  const [entriesPerJournal, setEntriesPerJournal] = useState(DEFAULTS.entriesPerJournal);
  const [journalAnalysisFreq, setJournalAnalysisFreq] = useState(DEFAULTS.journalAnalysisFreq);
  const [numCollections, setNumCollections] = useState(DEFAULTS.numCollections);
  const [collectionAnalysesPerMonth, setCollectionAnalysesPerMonth] = useState(DEFAULTS.collectionAnalysesPerMonth);

  // Pricing inputs
  const [sonnetInputPer1M, setSonnetInputPer1M] = useState(DEFAULTS.sonnetInputPer1M);
  const [sonnetOutputPer1M, setSonnetOutputPer1M] = useState(DEFAULTS.sonnetOutputPer1M);
  const [embeddingPer1M, setEmbeddingPer1M] = useState(DEFAULTS.embeddingPer1M);
  const [avgTokensPerResponse, setAvgTokensPerResponse] = useState(DEFAULTS.avgTokensPerResponse);

  // Reset
  const resetDefaults = () => {
    setActiveUsers(DEFAULTS.activeUsers);
    setConvsPerUser(DEFAULTS.convsPerUser);
    setResponsesPerConv(DEFAULTS.responsesPerConv);
    setTextQuestionsPerConv(DEFAULTS.textQuestionsPerConv);
    setClustersPerQuestion(DEFAULTS.clustersPerQuestion);
    setNonTextQuestions(DEFAULTS.nonTextQuestions);
    setPctSuggestedActions(DEFAULTS.pctSuggestedActions);
    setPctQuestionSuggestions(DEFAULTS.pctQuestionSuggestions);
    setJournalsPerUser(DEFAULTS.journalsPerUser);
    setEntriesPerJournal(DEFAULTS.entriesPerJournal);
    setJournalAnalysisFreq(DEFAULTS.journalAnalysisFreq);
    setNumCollections(DEFAULTS.numCollections);
    setCollectionAnalysesPerMonth(DEFAULTS.collectionAnalysesPerMonth);
    setSonnetInputPer1M(DEFAULTS.sonnetInputPer1M);
    setSonnetOutputPer1M(DEFAULTS.sonnetOutputPer1M);
    setEmbeddingPer1M(DEFAULTS.embeddingPer1M);
    setAvgTokensPerResponse(DEFAULTS.avgTokensPerResponse);
  };

  // ---------------------------------------------------------------------------
  // Calculation
  // ---------------------------------------------------------------------------

  const results = useMemo(() => {
    const totalConvs = activeUsers * convsPerUser;
    const totalTextResponses = totalConvs * responsesPerConv * textQuestionsPerConv;
    const totalJournals = activeUsers * journalsPerUser;
    const totalEntries = totalJournals * entriesPerJournal;
    const convsWithActions = totalConvs * (pctSuggestedActions / 100);
    const convsWithQSuggestions = totalConvs * (pctQuestionSuggestions / 100);

    const ops: OperationResult[] = [
      // 1. Embeddings (OpenAI) — 1 embedding call per text question per conversation
      //    tokens = responses × avg tokens per response (input to embedding model)
      {
        name: 'Embeddings',
        provider: 'openai',
        calls: totalConvs * textQuestionsPerConv,
        inputTokens: totalTextResponses * avgTokensPerResponse,
        outputTokens: 0,
      },
      // 2. Cluster Theme Analysis — clusters × text questions × conversations
      {
        name: 'Cluster Themes',
        provider: 'anthropic',
        calls: totalConvs * textQuestionsPerConv * clustersPerQuestion,
        inputTokens: totalConvs * textQuestionsPerConv * clustersPerQuestion * 500,
        outputTokens: totalConvs * textQuestionsPerConv * clustersPerQuestion * 1000,
      },
      // 3. Overall Summary — 1 per conversation
      {
        name: 'Overall Summary',
        provider: 'anthropic',
        calls: totalConvs,
        inputTokens: totalConvs * 400,
        outputTokens: totalConvs * 300,
      },
      // 4. Surprising Insights — 1 per conversation
      {
        name: 'Surprising Insights',
        provider: 'anthropic',
        calls: totalConvs,
        inputTokens: totalConvs * 800,
        outputTokens: totalConvs * 1200,
      },
      // 5. Suggested Actions — % of conversations
      {
        name: 'Suggested Actions',
        provider: 'anthropic',
        calls: convsWithActions,
        inputTokens: convsWithActions * 1000,
        outputTokens: convsWithActions * 1500,
      },
      // 6. Journal Full Analysis — journals × frequency
      {
        name: 'Journal Analysis',
        provider: 'anthropic',
        calls: totalJournals * journalAnalysisFreq,
        inputTokens: totalJournals * journalAnalysisFreq * 2000,
        outputTokens: totalJournals * journalAnalysisFreq * 4096,
      },
      // 7. Journal Entry Analysis — total entries
      {
        name: 'Journal Entries',
        provider: 'anthropic',
        calls: totalEntries,
        inputTokens: totalEntries * 500,
        outputTokens: totalEntries * 1024,
      },
      // 8. Collection Summary — collections × frequency
      {
        name: 'Collection Summary',
        provider: 'anthropic',
        calls: numCollections * collectionAnalysesPerMonth,
        inputTokens: numCollections * collectionAnalysesPerMonth * 800,
        outputTokens: numCollections * collectionAnalysesPerMonth * 400,
      },
      // 9. Question Suggestions — % of conversations
      {
        name: 'Question Suggestions',
        provider: 'anthropic',
        calls: convsWithQSuggestions,
        inputTokens: convsWithQSuggestions * 500,
        outputTokens: convsWithQSuggestions * 1024,
      },
    ];

    // Cost calculation
    const costPerInputToken = sonnetInputPer1M / 1_000_000;
    const costPerOutputToken = sonnetOutputPer1M / 1_000_000;
    const costPerEmbeddingToken = embeddingPer1M / 1_000_000;

    let totalCalls = 0;
    let totalCost = 0;
    let anthropicCost = 0;
    let openaiCost = 0;

    const breakdown = ops.map((op) => {
      let cost: number;
      if (op.provider === 'openai') {
        cost = op.inputTokens * costPerEmbeddingToken;
        openaiCost += cost;
      } else {
        cost = op.inputTokens * costPerInputToken + op.outputTokens * costPerOutputToken;
        anthropicCost += cost;
      }
      totalCalls += op.calls;
      totalCost += cost;
      return { ...op, cost };
    });

    return { breakdown, totalCalls, totalCost, anthropicCost, openaiCost };
  }, [
    activeUsers, convsPerUser, responsesPerConv, textQuestionsPerConv,
    clustersPerQuestion, nonTextQuestions, pctSuggestedActions, pctQuestionSuggestions,
    journalsPerUser, entriesPerJournal, journalAnalysisFreq,
    numCollections, collectionAnalysesPerMonth,
    sonnetInputPer1M, sonnetOutputPer1M, embeddingPer1M, avgTokensPerResponse,
  ]);

  // Formatters
  const fmtCost = (v: number) => v < 0.01 && v > 0 ? '<$0.01' : `$${v.toFixed(2)}`;
  const fmtNum = (v: number) => v >= 1_000_000
    ? `${(v / 1_000_000).toFixed(1)}M`
    : v >= 1_000
    ? `${(v / 1_000).toFixed(1)}K`
    : Math.round(v).toLocaleString();

  const anthropicPct = results.totalCost > 0 ? (results.anthropicCost / results.totalCost) * 100 : 0;
  const openaiPct = results.totalCost > 0 ? (results.openaiCost / results.totalCost) * 100 : 0;

  return (
    <div className="cost-estimator">
      <div className="cost-estimator-header">
        <div>
          <Link to="/adminportal" className="cost-estimator-back">Admin Portal</Link>
          <h1>LLM Cost Estimator</h1>
        </div>
        <div className="cost-estimator-header-actions">
          <button className="btn btn-secondary" onClick={resetDefaults}>
            Reset Defaults
          </button>
        </div>
      </div>

      <div className="cost-estimator-grid">
        {/* Left column: Inputs */}
        <div className="cost-inputs">
          {/* Primary inputs — always visible */}
          <div className="cost-section">
            <div className="cost-section-header">
              <h2>Usage Parameters</h2>
            </div>
            <div className="cost-section-body">
              <SliderInput label="Active users" value={activeUsers} min={1} max={10000} step={1} onChange={setActiveUsers} />
              <SliderInput label="Conversations per user / month" value={convsPerUser} min={0} max={50} step={1} onChange={setConvsPerUser} />
              <SliderInput label="Responses per conversation" value={responsesPerConv} min={1} max={500} step={1} onChange={setResponsesPerConv} />
              <SliderInput label="Text questions per conversation" value={textQuestionsPerConv} min={0} max={20} step={1} onChange={setTextQuestionsPerConv} />
            </div>
          </div>

          {/* Advanced inputs — collapsible */}
          <div className="cost-section">
            <div className="cost-section-header" onClick={() => setShowAdvanced(!showAdvanced)}>
              <h2>Advanced Parameters</h2>
              <span className={`section-toggle ${showAdvanced ? 'open' : ''}`}>&#9660;</span>
            </div>
            {showAdvanced && (
              <div className="cost-section-body">
                <SliderInput label="Clusters per text question" value={clustersPerQuestion} min={1} max={10} step={1} onChange={setClustersPerQuestion} />
                <SliderInput label="Non-text questions per conversation" value={nonTextQuestions} min={0} max={20} step={1} onChange={setNonTextQuestions} />
                <SliderInput label="Conversations with suggested actions" value={pctSuggestedActions} min={0} max={100} step={1} onChange={setPctSuggestedActions} suffix="%" />
                <SliderInput label="Conversations using question suggestions" value={pctQuestionSuggestions} min={0} max={100} step={1} onChange={setPctQuestionSuggestions} suffix="%" />
                <SliderInput label="Journals per user" value={journalsPerUser} min={0} max={10} step={0.1} onChange={setJournalsPerUser} />
                <SliderInput label="Entries per journal / month" value={entriesPerJournal} min={0} max={60} step={1} onChange={setEntriesPerJournal} />
                <SliderInput label="Journal analysis frequency / month" value={journalAnalysisFreq} min={0} max={30} step={1} onChange={setJournalAnalysisFreq} />
                <SliderInput label="Number of collections" value={numCollections} min={0} max={100} step={1} onChange={setNumCollections} />
                <SliderInput label="Collection analyses / month" value={collectionAnalysesPerMonth} min={0} max={30} step={1} onChange={setCollectionAnalysesPerMonth} />
              </div>
            )}
          </div>

          {/* Pricing inputs — collapsible */}
          <div className="cost-section">
            <div className="cost-section-header" onClick={() => setShowPricing(!showPricing)}>
              <h2>Pricing Assumptions</h2>
              <span className={`section-toggle ${showPricing ? 'open' : ''}`}>&#9660;</span>
            </div>
            {showPricing && (
              <div className="cost-section-body">
                <SliderInput label="Claude Sonnet input ($/1M tokens)" value={sonnetInputPer1M} min={0} max={30} step={0.1} onChange={setSonnetInputPer1M} suffix="$" />
                <SliderInput label="Claude Sonnet output ($/1M tokens)" value={sonnetOutputPer1M} min={0} max={100} step={0.5} onChange={setSonnetOutputPer1M} suffix="$" />
                <SliderInput label="OpenAI embedding ($/1M tokens)" value={embeddingPer1M} min={0} max={1} step={0.001} onChange={setEmbeddingPer1M} suffix="$" />
                <SliderInput label="Avg tokens per response" value={avgTokensPerResponse} min={10} max={500} step={5} onChange={setAvgTokensPerResponse} />
              </div>
            )}
          </div>
        </div>

        {/* Right column: Results */}
        <div className="cost-results">
          <div className="cost-results-card">
            <div className="cost-results-header">
              <h2>Monthly Estimate</h2>
            </div>

            {/* Big numbers */}
            <div className="cost-summary">
              <div className="cost-summary-stat">
                <span className="stat-label">Total Cost</span>
                <span className="stat-value">{fmtCost(results.totalCost)}</span>
              </div>
              <div className="cost-summary-stat">
                <span className="stat-label">LLM Calls</span>
                <span className="stat-value">{fmtNum(results.totalCalls)}</span>
              </div>
            </div>

            {/* Cost split bar */}
            <div className="cost-split">
              <div className="cost-split-label">Provider Split</div>
              <div className="cost-split-bar">
                {anthropicPct > 0 && (
                  <div
                    className="cost-split-segment anthropic"
                    style={{ width: `${anthropicPct}%` }}
                  >
                    {anthropicPct >= 15 ? `${anthropicPct.toFixed(0)}%` : ''}
                  </div>
                )}
                {openaiPct > 0 && (
                  <div
                    className="cost-split-segment openai"
                    style={{ width: `${openaiPct}%` }}
                  >
                    {openaiPct >= 15 ? `${openaiPct.toFixed(0)}%` : ''}
                  </div>
                )}
              </div>
              <div className="cost-split-legend">
                <div className="cost-split-legend-item">
                  <span className="cost-split-legend-dot anthropic" />
                  Anthropic {fmtCost(results.anthropicCost)}
                </div>
                <div className="cost-split-legend-item">
                  <span className="cost-split-legend-dot openai" />
                  OpenAI {fmtCost(results.openaiCost)}
                </div>
              </div>
            </div>

            {/* Breakdown table */}
            <div className="cost-breakdown">
              <table className="cost-breakdown-table">
                <thead>
                  <tr>
                    <th>Operation</th>
                    <th>Calls</th>
                    <th>In Tokens</th>
                    <th>Out Tokens</th>
                    <th>Cost</th>
                  </tr>
                </thead>
                <tbody>
                  {results.breakdown.map((row) => (
                    <tr key={row.name}>
                      <td className="op-name">{row.name}</td>
                      <td>{fmtNum(row.calls)}</td>
                      <td>{fmtNum(row.inputTokens)}</td>
                      <td>{row.outputTokens > 0 ? fmtNum(row.outputTokens) : '-'}</td>
                      <td>{fmtCost(row.cost)}</td>
                    </tr>
                  ))}
                </tbody>
                <tfoot>
                  <tr>
                    <td>Total</td>
                    <td>{fmtNum(results.totalCalls)}</td>
                    <td>{fmtNum(results.breakdown.reduce((s, r) => s + r.inputTokens, 0))}</td>
                    <td>{fmtNum(results.breakdown.reduce((s, r) => s + r.outputTokens, 0))}</td>
                    <td>{fmtCost(results.totalCost)}</td>
                  </tr>
                </tfoot>
              </table>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
