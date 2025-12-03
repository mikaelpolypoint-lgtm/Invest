import React, { useEffect, useState } from 'react';
import Papa from 'papaparse';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { motion } from 'framer-motion';
import { Layers, Calendar } from 'lucide-react';

// --- Types ---
interface Story {
    'Issue key': string;
    Team: string;
    Sprint: string;
    'Story Points': string; // CSV parses as string initially
    'Parent key': string;
    'Parent summary': string;
}

interface TeamConfig {
    costPerPoint: number;
    color: string;
}

const TEAM_CONFIG: Record<string, TeamConfig> = {
    'Tungsten': { costPerPoint: 900, color: '#8b5cf6' }, // Violet
    'Neon': { costPerPoint: 1460, color: '#ec4899' },     // Pink
    'H1': { costPerPoint: 1270, color: '#10b981' },       // Emerald
    'Zn2C': { costPerPoint: 1280, color: '#f59e0b' },     // Amber
};

interface ParentStats {
    key: string;
    summary: string;
    teams: Record<string, number>;
    totalPoints: number;
}

interface SprintStats {
    points: number;
    value: number;
}

interface TeamStats {
    name: string;
    totalPoints: number;
    totalValue: number;
    sprints: Record<string, SprintStats>;
}

interface InitiativeStat {
    name: string;
    budget: number;
    planned: number;
}

// --- Components ---

const Card = ({ children, className = '', style = {} }: { children: React.ReactNode; className?: string; style?: React.CSSProperties }) => (
    <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className={`card ${className}`}
        style={style}
    >
        {children}
    </motion.div>
);

export default function Dashboard() {
    const [parentStats, setParentStats] = useState<ParentStats[]>([]);
    const [teamStats, setTeamStats] = useState<TeamStats[]>([]);
    const [initiativeStats, setInitiativeStats] = useState<InitiativeStat[]>([]);
    const [loading, setLoading] = useState(true);
    const [viewMode, setViewMode] = useState<'points' | 'value'>('points');

    useEffect(() => {
        const fetchData = async () => {
            try {
                const response = await fetch(import.meta.env.BASE_URL + 'PI261_Stories.csv');
                const reader = response.body?.getReader();
                const result = await reader?.read();
                const decoder = new TextDecoder('utf-8');
                const csv = decoder.decode(result?.value);

                Papa.parse(csv, {
                    header: true,
                    skipEmptyLines: true,
                    complete: (results) => {
                        const stories = results.data as Story[];
                        processData(stories);
                        processInitiativeData(stories);
                        setLoading(false);
                    }
                });
            } catch (error) {
                console.error("Error fetching CSV:", error);
                setLoading(false);
            }
        };

        fetchData();
    }, []);

    const processInitiativeData = (stories: Story[]) => {
        const savedState = localStorage.getItem('initiative_planning');
        if (!savedState) return;

        try {
            const { initiatives } = JSON.parse(savedState);

            // Calculate Epic Values first
            const epicValues: Record<string, number> = {};
            stories.forEach(story => {
                const team = story.Team;
                const points = parseFloat(story['Story Points'] || '0');
                let parentKey = story['Parent key'];
                if (!team || isNaN(points)) return;
                if (!parentKey) parentKey = "No Epic";

                const value = points * (TEAM_CONFIG[team]?.costPerPoint || 0);
                epicValues[parentKey] = (epicValues[parentKey] || 0) + value;
            });

            const stats: InitiativeStat[] = initiatives.map((init: any) => ({
                name: init.name,
                budget: init.budget,
                planned: init.epics.reduce((sum: number, epicKey: string) => sum + (epicValues[epicKey] || 0), 0)
            })).filter((i: InitiativeStat) => i.budget > 0 || i.planned > 0);

            setInitiativeStats(stats);
        } catch (e) {
            console.error("Failed to parse initiative data", e);
        }
    };

    const processData = (stories: Story[]) => {
        // 1. Parent Key Stats
        const pStats: Record<string, ParentStats> = {};

        // 2. Team Stats
        const tStats: Record<string, TeamStats> = {};

        // Initialize Team Stats
        Object.keys(TEAM_CONFIG).forEach(team => {
            tStats[team] = {
                name: team,
                totalPoints: 0,
                totalValue: 0,
                sprints: {}
            };
        });

        stories.forEach(story => {
            const team = story.Team;
            const points = parseFloat(story['Story Points'] || '0');
            let parentKey = story['Parent key'];
            let parentSummary = story['Parent summary'];
            const sprint = story.Sprint;

            if (!team || isNaN(points)) return;

            // Handle missing Parent Key
            if (!parentKey) {
                parentKey = "No Epic";
                parentSummary = "Stories without a parent feature";
            }

            // Update Parent Stats
            if (!pStats[parentKey]) {
                pStats[parentKey] = {
                    key: parentKey,
                    summary: parentSummary,
                    teams: {},
                    totalPoints: 0
                };
            }
            if (!pStats[parentKey].teams[team]) {
                pStats[parentKey].teams[team] = 0;
            }
            pStats[parentKey].teams[team] += points;
            pStats[parentKey].totalPoints += points;

            // Update Team Stats
            if (tStats[team]) {
                tStats[team].totalPoints += points;
                const value = points * TEAM_CONFIG[team].costPerPoint;
                tStats[team].totalValue += value;

                if (!tStats[team].sprints[sprint]) {
                    tStats[team].sprints[sprint] = { points: 0, value: 0 };
                }
                tStats[team].sprints[sprint].points += points;
                tStats[team].sprints[sprint].value += value;
            }
        });

        setParentStats(Object.values(pStats).sort((a, b) => b.totalPoints - a.totalPoints));
        setTeamStats(Object.values(tStats));
    };

    const formatCurrency = (val: number) => {
        return new Intl.NumberFormat('de-CH', { style: 'currency', currency: 'CHF', maximumFractionDigits: 0 }).format(val);
    };

    const calculateParentTotalValue = (parent: ParentStats) => {
        return Object.entries(parent.teams).reduce((sum, [team, points]) => {
            return sum + (points * (TEAM_CONFIG[team]?.costPerPoint || 0));
        }, 0);
    };

    if (loading) return <div className="loading-screen">Loading Report...</div>;

    return (
        <div className="container">
            <motion.div
                initial={{ opacity: 0, y: -20 }}
                animate={{ opacity: 1, y: 0 }}
                className="mb-large"
            >
                <h1>Investment Report <span className="text-accent">PI 26.1</span></h1>
                <p className="text-muted text-lg">Strategic investment analysis per Team and Feature</p>
            </motion.div>

            {/* Initiative Budget vs Planned Chart */}
            {initiativeStats.length > 0 && (
                <Card className="mb-large">
                    <div className="flex-start mb-medium">
                        <Calendar className="text-accent" />
                        <h2 className="text-2xl font-bold text-slate-900 m-0">Roadmap Alignment: Budget vs Planned</h2>
                    </div>
                    <div className="chart-container" style={{ height: '400px' }}>
                        <ResponsiveContainer width="100%" height="100%">
                            <BarChart data={initiativeStats} layout="vertical" margin={{ left: 150, right: 50 }}>
                                <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" horizontal={false} />
                                <XAxis type="number" stroke="#64748b" tickFormatter={(val) => `${val / 1000}k`} />
                                <YAxis type="category" dataKey="name" stroke="#64748b" width={140} tick={{ fill: '#334155', fontSize: 12 }} />
                                <Tooltip
                                    contentStyle={{ backgroundColor: '#ffffff', borderColor: '#e2e8f0', color: '#0f172a', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                                    itemStyle={{ color: '#0f172a' }}
                                    formatter={(value: number) => formatCurrency(value)}
                                />
                                <Legend />
                                <Bar dataKey="budget" name="Roadmap Budget" fill="#94a3b8" radius={[0, 4, 4, 0]} />
                                <Bar dataKey="planned" name="Planned Investment" fill="#38bdf8" radius={[0, 4, 4, 0]} />
                            </BarChart>
                        </ResponsiveContainer>
                    </div>
                </Card>
            )}

            {/* Team Overview Cards */}
            <div className="grid-cards">
                {teamStats.map((team) => (
                    <Card key={team.name} className="overview-card" style={{ borderTop: `4px solid ${TEAM_CONFIG[team.name]?.color}` }}>
                        <div>
                            <div className="flex-between mb-medium">
                                <h3 className="text-xl font-bold text-slate-900">{team.name}</h3>
                                <span className="badge">
                                    {TEAM_CONFIG[team.name]?.costPerPoint} CHF/SP
                                </span>
                            </div>
                            <div className="stack">
                                <div>
                                    <div className="text-slate-500 text-sm">Total Investment</div>
                                    <div className="text-2xl font-bold text-slate-900">{formatCurrency(team.totalValue)}</div>
                                </div>
                                <div>
                                    <div className="text-slate-500 text-sm">Story Points</div>
                                    <div className="text-xl font-bold text-slate-900" style={{ opacity: 0.8 }}>{team.totalPoints} SP</div>
                                </div>
                            </div>
                        </div>
                    </Card>
                ))}
            </div>

            {/* Parent Key Breakdown */}
            <Card>
                <div className="flex-between mb-medium">
                    <div className="flex-start">
                        <Layers className="text-accent" />
                        <h2 className="text-2xl font-bold text-slate-900 m-0">Investment by Feature (Parent Key)</h2>
                    </div>
                    <div className="flex bg-slate-100 rounded-lg p-1 border border-slate-200">
                        <button
                            onClick={() => setViewMode('points')}
                            className={`px-3 py-1 rounded-md text-sm font-medium transition-colors ${viewMode === 'points' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500 hover:text-slate-900'}`}
                        >
                            Story Points
                        </button>
                        <button
                            onClick={() => setViewMode('value')}
                            className={`px-3 py-1 rounded-md text-sm font-medium transition-colors ${viewMode === 'value' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500 hover:text-slate-900'}`}
                        >
                            CHF Value
                        </button>
                    </div>
                </div>
                <div className="table-container">
                    <table>
                        <thead>
                            <tr>
                                <th style={{ width: '150px' }}>Key</th>
                                <th>Summary</th>
                                {Object.keys(TEAM_CONFIG).map(t => <th key={t} className="text-right" style={{ color: TEAM_CONFIG[t].color, width: '100px' }}>{t}</th>)}
                                <th className="text-right text-slate-900" style={{ width: '120px' }}>Total {viewMode === 'points' ? 'SP' : 'CHF'}</th>
                            </tr>
                        </thead>
                        <tbody>
                            {parentStats.map((parent) => {
                                const totalValue = calculateParentTotalValue(parent);
                                return (
                                    <tr key={parent.key} className="table-row">
                                        <td className="font-mono text-accent font-bold">{parent.key}</td>
                                        <td className="text-slate-700">{parent.summary}</td>
                                        {Object.keys(TEAM_CONFIG).map(t => {
                                            const points = parent.teams[t] || 0;
                                            const value = points * (TEAM_CONFIG[t]?.costPerPoint || 0);
                                            return (
                                                <td key={t} className="text-right font-mono text-slate-500">
                                                    {points > 0 ? (
                                                        <span className="text-slate-900">
                                                            {viewMode === 'points' ? points : formatCurrency(value)}
                                                        </span>
                                                    ) : '-'}
                                                </td>
                                            );
                                        })}
                                        <td className="text-right font-bold text-slate-900">
                                            {viewMode === 'points' ? parent.totalPoints : formatCurrency(totalValue)}
                                        </td>
                                    </tr>
                                );
                            })}
                        </tbody>
                    </table>
                </div>
            </Card>

            {/* Sprint Breakdown Charts */}
            <div className="grid-charts" style={{ marginTop: '3rem' }}>
                {teamStats.map((team) => {
                    const sprintData = Object.entries(team.sprints)
                        .map(([sprintName, stats]) => ({
                            name: sprintName.split('-').pop() || sprintName, // Shorten sprint name
                            points: stats.points,
                            value: stats.value
                        }))
                        .sort((a, b) => a.name.localeCompare(b.name));

                    return (
                        <Card key={team.name}>
                            <div className="flex-between mb-medium">
                                <div className="flex-start">
                                    <Calendar className="text-slate-400" size={20} />
                                    <h3 className="text-xl font-bold text-slate-900 m-0">{team.name} <span className="text-slate-400 font-normal" style={{ fontSize: '0.9em' }}>Sprint Plan</span></h3>
                                </div>
                                <div className="text-right">
                                    <div className="text-xs text-slate-500">Total Value</div>
                                    <div className="text-sm font-bold text-success">{formatCurrency(team.totalValue)}</div>
                                </div>
                            </div>

                            <div className="chart-container">
                                <ResponsiveContainer width="100%" height="100%">
                                    <BarChart data={sprintData}>
                                        <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" vertical={false} />
                                        <XAxis dataKey="name" stroke="#64748b" tick={{ fill: '#64748b' }} />
                                        <YAxis yAxisId="left" stroke="#64748b" tick={{ fill: '#64748b' }} />
                                        <YAxis yAxisId="right" orientation="right" stroke="#10b981" tick={{ fill: '#10b981' }} tickFormatter={(val) => `${val / 1000}k`} />
                                        <Tooltip
                                            contentStyle={{ backgroundColor: '#ffffff', borderColor: '#e2e8f0', color: '#0f172a', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                                            itemStyle={{ color: '#0f172a' }}
                                            formatter={(value: number, name: string) => [
                                                name === 'value' ? formatCurrency(value) : value,
                                                name === 'value' ? 'Value (CHF)' : 'Points'
                                            ]}
                                        />
                                        <Legend />
                                        <Bar yAxisId="left" dataKey="points" name="Story Points" fill={TEAM_CONFIG[team.name].color} radius={[4, 4, 0, 0]} />
                                        <Bar yAxisId="right" dataKey="value" name="Value (CHF)" fill="#10b981" radius={[4, 4, 0, 0]} opacity={0.5} />
                                    </BarChart>
                                </ResponsiveContainer>
                            </div>
                        </Card>
                    );
                })}
            </div>
        </div>
    );
}
