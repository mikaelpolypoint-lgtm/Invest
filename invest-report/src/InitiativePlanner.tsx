import { useEffect, useState } from 'react';
import Papa from 'papaparse';
import { DragDropContext, Droppable, Draggable, type DropResult } from '@hello-pangea/dnd';
import { AlertCircle, GripVertical } from 'lucide-react';

// --- Types ---
interface Story {
    'Issue key': string;
    Team: string;
    'Story Points': string;
    'Parent key': string;
    'Parent summary': string;
}

interface Topic {
    Prio: string;
    Topic: string;
    Invest: string;
}

interface Initiative {
    id: string;
    name: string;
    priority: number;
    budget: number;
    epics: string[]; // List of Epic Keys assigned
}

interface EpicData {
    key: string;
    summary: string;
    totalValue: number; // Calculated from stories
}

interface TeamConfig {
    costPerPoint: number;
}

const TEAM_CONFIG: Record<string, TeamConfig> = {
    'Tungsten': { costPerPoint: 900 },
    'Neon': { costPerPoint: 1460 },
    'H1': { costPerPoint: 1270 },
    'Zn2C': { costPerPoint: 1280 },
};

export default function InitiativePlanner() {
    const [initiatives, setInitiatives] = useState<Initiative[]>([]);
    const [epics, setEpics] = useState<Record<string, EpicData>>({});
    const [unassignedEpics, setUnassignedEpics] = useState<string[]>([]);
    const [loading, setLoading] = useState(true);

    // Load data on mount
    useEffect(() => {
        const loadData = async () => {
            try {
                // 1. Load Topics
                const topicsResponse = await fetch('/Topics.csv');
                const topicsText = await topicsResponse.text();
                const topicsData = Papa.parse<Topic>(topicsText, { header: true, delimiter: ';', skipEmptyLines: true }).data;

                const processedInitiatives: Initiative[] = topicsData.map((t, index) => ({
                    id: `init-${index}-${t.Topic.replace(/\s+/g, '-').toLowerCase()}`,
                    name: t.Topic,
                    priority: parseInt(t.Prio) || 0,
                    budget: parseInt(t.Invest) || 0,
                    epics: []
                }));

                // 2. Load Stories
                const storiesResponse = await fetch('/PI261_Stories.csv');
                const storiesText = await storiesResponse.text();
                const storiesData = Papa.parse<Story>(storiesText, { header: true, skipEmptyLines: true }).data;

                processData(processedInitiatives, storiesData);
            } catch (error) {
                console.error("Failed to load data", error);
                setLoading(false);
            }
        };
        loadData();
    }, []);

    const processData = (initialInitiatives: Initiative[], stories: Story[]) => {
        // Process Epics and Values
        const epicMap: Record<string, EpicData> = {};

        stories.forEach(story => {
            const team = story.Team;
            const points = parseFloat(story['Story Points'] || '0');
            let parentKey = story['Parent key'];
            let parentSummary = story['Parent summary'];

            if (!team || isNaN(points)) return;
            if (!parentKey) {
                parentKey = "No Epic";
                parentSummary = "Stories without a parent feature";
            }

            if (!epicMap[parentKey]) {
                epicMap[parentKey] = { key: parentKey, summary: parentSummary, totalValue: 0 };
            }

            const value = points * (TEAM_CONFIG[team]?.costPerPoint || 0);
            epicMap[parentKey].totalValue += value;
        });

        setEpics(epicMap);

        // Initialize Initiatives
        // Check localStorage for saved state
        const savedState = localStorage.getItem('initiative_planning');

        if (savedState) {
            try {
                const parsed = JSON.parse(savedState);
                // Merge saved state with fresh data structure if needed, or just use saved state
                // Ideally we should reconcile, but for now let's trust localStorage if valid
                // However, if we added IDs, old localStorage might be missing them.
                // Let's re-map IDs if missing.
                const savedInitiatives = parsed.initiatives.map((init: any, index: number) => ({
                    ...init,
                    id: init.id || `init-${index}-${init.name.replace(/\s+/g, '-').toLowerCase()}`
                }));
                setInitiatives(savedInitiatives);
                setUnassignedEpics(parsed.unassignedEpics);
            } catch (e) {
                console.error("Failed to parse saved state", e);
                setInitiatives(initialInitiatives);
                setUnassignedEpics(Object.keys(epicMap));
            }
        } else {
            const initList: Initiative[] = initialInitiatives.sort((a, b) => a.priority - b.priority);

            setInitiatives(initList);
            setUnassignedEpics(Object.keys(epicMap));
        }

        setLoading(false);
    };

    const onDragEnd = (result: DropResult) => {
        const { source, destination, draggableId } = result;

        if (!destination) return;
        if (source.droppableId === destination.droppableId && source.index === destination.index) return;

        // Helper to remove from list
        const removeEpic = (list: string[], index: number) => {
            const result = Array.from(list);
            const [removed] = result.splice(index, 1);
            return { result, removed };
        };

        // Helper to add to list
        const addEpic = (list: string[], index: number, epic: string) => {
            const result = Array.from(list);
            result.splice(index, 0, epic);
            return result;
        };

        let newUnassigned = [...unassignedEpics];
        let newInitiatives = [...initiatives];

        // Remove from source
        if (source.droppableId === 'unassigned') {
            const { result } = removeEpic(newUnassigned, source.index);
            newUnassigned = result;
        } else {
            // Find initiative by ID
            const initIndex = newInitiatives.findIndex(i => i.id === source.droppableId);
            if (initIndex !== -1) {
                const { result } = removeEpic(newInitiatives[initIndex].epics, source.index);
                newInitiatives[initIndex] = { ...newInitiatives[initIndex], epics: result };
            }
        }

        // Add to destination
        if (destination.droppableId === 'unassigned') {
            newUnassigned = addEpic(newUnassigned, destination.index, draggableId);
        } else {
            // Find initiative by ID
            const initIndex = newInitiatives.findIndex(i => i.id === destination.droppableId);
            if (initIndex !== -1) {
                const newEpics = addEpic(newInitiatives[initIndex].epics, destination.index, draggableId);
                newInitiatives[initIndex] = { ...newInitiatives[initIndex], epics: newEpics };
            }
        }

        setUnassignedEpics(newUnassigned);
        setInitiatives(newInitiatives);

        // Save to local storage
        localStorage.setItem('initiative_planning', JSON.stringify({
            initiatives: newInitiatives,
            unassignedEpics: newUnassigned
        }));
    };

    const formatCurrency = (val: number) => {
        return new Intl.NumberFormat('de-CH', { style: 'currency', currency: 'CHF', maximumFractionDigits: 0 }).format(val);
    };

    const [viewMode, setViewMode] = useState<'board' | 'table'>('board');

    // ... (existing useEffect and processData)

    // Debugging
    console.log("Rendering Initiatives:", initiatives.map(i => ({ name: i.name, id: i.id })));

    if (loading) return <div className="loading-screen">Loading Planner...</div>;

    return (
        <div className="container px-4 h-[calc(100vh-80px)] flex flex-col">
            <div className="flex justify-between items-center py-6 flex-shrink-0">
                <div>
                    <h1 className="text-2xl font-bold m-0 text-slate-900">Initiative Planning</h1>
                    <p className="text-slate-500 text-sm">Assign Epics to Roadmap Initiatives</p>
                </div>
                <div className="flex items-center gap-4">
                    <div className="flex bg-slate-100 rounded-lg p-1 border border-slate-200">
                        <button
                            onClick={() => setViewMode('board')}
                            className={`px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${viewMode === 'board' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500 hover:text-slate-900'}`}
                        >
                            Board
                        </button>
                        <button
                            onClick={() => setViewMode('table')}
                            className={`px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${viewMode === 'table' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500 hover:text-slate-900'}`}
                        >
                            Table
                        </button>
                    </div>
                    <button
                        onClick={() => {
                            localStorage.removeItem('initiative_planning');
                            window.location.reload();
                        }}
                        className="px-3 py-1.5 text-xs text-red-600 hover:text-red-700 border border-red-200 rounded-md hover:bg-red-50 transition-colors"
                    >
                        Reset Planning
                    </button>
                </div>
            </div>

            {viewMode === 'board' ? (
                <DragDropContext onDragEnd={onDragEnd}>
                    <div className="flex gap-6 flex-1 min-h-0 pb-6">
                        {/* Initiatives Column - Grid Layout (Left) */}
                        <div className="flex-1 overflow-y-auto min-h-0 pr-2 custom-scrollbar">
                            <div className="grid grid-cols-1 lg:grid-cols-2 2xl:grid-cols-3 gap-4">
                                {initiatives.map((initiative) => {
                                    const plannedValue = initiative.epics.reduce((sum, key) => sum + (epics[key]?.totalValue || 0), 0);
                                    const budgetUsage = initiative.budget > 0 ? (plannedValue / initiative.budget) * 100 : 0;
                                    const isOverBudget = plannedValue > initiative.budget;
                                    const safeId = initiative.id || `fallback-${initiative.name}`; // Fallback ID

                                    return (
                                        <div key={safeId} className="bg-white rounded-xl border border-slate-200 overflow-hidden flex flex-col h-full shadow-sm">
                                            <div className="p-3 bg-slate-50 border-b border-slate-200">
                                                <div className="flex justify-between items-start mb-2">
                                                    <div className="min-w-0 flex-1 mr-2">
                                                        <div className="flex items-center gap-2 mb-1">
                                                            <h3 className="text-sm font-bold text-slate-900 truncate" title={initiative.name}>{initiative.name}</h3>
                                                            <span className={`text-[10px] px-1.5 py-0.5 rounded font-mono flex-shrink-0 ${initiative.priority === 0 ? 'bg-red-100 text-red-700' : 'bg-slate-200 text-slate-600'
                                                                }`}>
                                                                P{initiative.priority}
                                                            </span>
                                                        </div>
                                                        <div className="text-xs text-slate-500 flex items-center gap-1">
                                                            <span className={isOverBudget ? 'text-red-600 font-bold' : 'text-emerald-600 font-bold'}>{formatCurrency(plannedValue)}</span>
                                                            <span className="text-slate-400">/</span>
                                                            <span className="text-slate-500">{formatCurrency(initiative.budget)}</span>
                                                        </div>
                                                    </div>
                                                    <div className="text-right flex-shrink-0">
                                                        <div className={`text-lg font-bold ${isOverBudget ? 'text-red-600' : 'text-emerald-600'}`}>
                                                            {Math.round(budgetUsage)}%
                                                        </div>
                                                    </div>
                                                </div>

                                                {/* Progress Bar */}
                                                <div className="h-1.5 bg-slate-200 rounded-full overflow-hidden">
                                                    <div
                                                        className={`h-full transition-all duration-500 ${isOverBudget ? 'bg-red-500' : 'bg-emerald-500'}`}
                                                        style={{ width: `${Math.min(budgetUsage, 100)}%` }}
                                                    />
                                                </div>
                                            </div>

                                            <Droppable droppableId={safeId}>
                                                {(provided, snapshot) => (
                                                    <div
                                                        ref={provided.innerRef}
                                                        {...provided.droppableProps}
                                                        className={`p-3 flex-1 transition-colors min-h-[80px] ${snapshot.isDraggingOver ? 'bg-slate-50' : ''
                                                            }`}
                                                    >
                                                        {initiative.epics.length === 0 && (
                                                            <div className="h-full flex items-center justify-center text-slate-400 text-xs border-2 border-dashed border-slate-200 rounded-lg">
                                                                Drop Epics here
                                                            </div>
                                                        )}
                                                        <div className="space-y-2">
                                                            {initiative.epics.map((epicKey, index) => {
                                                                const epic = epics[epicKey];
                                                                if (!epic) return null;
                                                                return (
                                                                    <Draggable key={epicKey} draggableId={epicKey} index={index}>
                                                                        {(provided, snapshot) => (
                                                                            <div
                                                                                ref={provided.innerRef}
                                                                                {...provided.draggableProps}
                                                                                {...provided.dragHandleProps}
                                                                                className={`p-2 rounded border bg-white border-slate-200 flex justify-between items-center gap-2 ${snapshot.isDragging ? 'shadow-xl z-50 border-blue-400' : 'hover:border-slate-300'
                                                                                    }`}
                                                                                style={provided.draggableProps.style}
                                                                            >
                                                                                <div className="flex items-center gap-2 overflow-hidden">
                                                                                    <GripVertical size={14} className="text-slate-400 flex-shrink-0" />
                                                                                    <div className="overflow-hidden">
                                                                                        <div className="font-mono text-[10px] text-blue-600">{epic.key}</div>
                                                                                        <div className="text-xs text-slate-600 truncate" title={epic.summary}>{epic.summary}</div>
                                                                                    </div>
                                                                                </div>
                                                                                <div className="text-xs font-bold text-emerald-600 whitespace-nowrap">
                                                                                    {formatCurrency(epic.totalValue)}
                                                                                </div>
                                                                            </div>
                                                                        )}
                                                                    </Draggable>
                                                                );
                                                            })}
                                                        </div>
                                                        {provided.placeholder}
                                                    </div>
                                                )}
                                            </Droppable>
                                        </div>
                                    );
                                })}
                            </div>
                        </div>

                        {/* Unassigned Column - Fixed Sidebar (Right) */}
                        <div className="w-80 flex-shrink-0 flex flex-col bg-white rounded-xl border border-slate-200 shadow-sm">
                            <div className="p-3 border-b border-slate-200 bg-slate-50 rounded-t-xl">
                                <h2 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                                    <AlertCircle size={16} className="text-yellow-500" />
                                    Unassigned Epics
                                    <span className="ml-auto bg-slate-200 text-slate-600 text-xs px-2 py-0.5 rounded-full">{unassignedEpics.length}</span>
                                </h2>
                            </div>
                            <Droppable droppableId="unassigned">
                                {(provided) => (
                                    <div
                                        ref={provided.innerRef}
                                        {...provided.droppableProps}
                                        className="flex-1 overflow-y-auto p-3 space-y-2 custom-scrollbar"
                                    >
                                        {unassignedEpics.map((epicKey, index) => {
                                            const epic = epics[epicKey];
                                            if (!epic) return null;
                                            return (
                                                <Draggable key={epicKey} draggableId={epicKey} index={index}>
                                                    {(provided, snapshot) => (
                                                        <div
                                                            ref={provided.innerRef}
                                                            {...provided.draggableProps}
                                                            {...provided.dragHandleProps}
                                                            className={`p-2.5 rounded-lg border transition-all ${snapshot.isDragging
                                                                ? 'bg-blue-50 border-blue-400 shadow-xl z-50'
                                                                : 'bg-white border-slate-200 hover:border-slate-300'
                                                                }`}
                                                            style={provided.draggableProps.style}
                                                        >
                                                            <div className="flex justify-between items-start mb-1">
                                                                <span className="font-mono text-[10px] text-blue-600 bg-blue-50 px-1 py-0.5 rounded">{epic.key}</span>
                                                                <span className="text-xs font-bold text-emerald-600">{formatCurrency(epic.totalValue)}</span>
                                                            </div>
                                                            <p className="text-xs text-slate-600 line-clamp-2 leading-relaxed">{epic.summary}</p>
                                                        </div>
                                                    )}
                                                </Draggable>
                                            );
                                        })}
                                        {provided.placeholder}
                                    </div>
                                )}
                            </Droppable>
                        </div>
                    </div>
                </DragDropContext>
            ) : (
                <div className="flex-1 overflow-auto custom-scrollbar bg-white rounded-xl border border-slate-200 shadow-sm">
                    <table className="w-full text-sm text-left">
                        <thead className="text-xs text-slate-500 uppercase bg-slate-50 sticky top-0 z-10">
                            <tr>
                                <th className="px-6 py-3">Priority</th>
                                <th className="px-6 py-3">Initiative</th>
                                <th className="px-6 py-3 text-right">Budget</th>
                                <th className="px-6 py-3 text-right">Planned</th>
                                <th className="px-6 py-3 text-right">Status</th>
                                <th className="px-6 py-3">Assigned Epics</th>
                            </tr>
                        </thead>
                        <tbody>
                            {initiatives.map((initiative) => {
                                const plannedValue = initiative.epics.reduce((sum, key) => sum + (epics[key]?.totalValue || 0), 0);
                                const budgetUsage = initiative.budget > 0 ? (plannedValue / initiative.budget) * 100 : 0;
                                const isOverBudget = plannedValue > initiative.budget;

                                return (
                                    <tr key={initiative.id || initiative.name} className="border-b border-slate-100 hover:bg-slate-50">
                                        <td className="px-6 py-4 font-mono">P{initiative.priority}</td>
                                        <td className="px-6 py-4 font-medium text-slate-900">{initiative.name}</td>
                                        <td className="px-6 py-4 text-right font-mono text-slate-600">{formatCurrency(initiative.budget)}</td>
                                        <td className={`px-6 py-4 text-right font-mono font-bold ${isOverBudget ? 'text-red-600' : 'text-emerald-600'}`}>
                                            {formatCurrency(plannedValue)}
                                        </td>
                                        <td className="px-6 py-4 text-right">
                                            <span className={`px-2 py-1 rounded-full text-xs font-bold ${isOverBudget ? 'bg-red-100 text-red-700' : 'bg-emerald-100 text-emerald-700'}`}>
                                                {Math.round(budgetUsage)}%
                                            </span>
                                        </td>
                                        <td className="px-6 py-4">
                                            <div className="flex flex-wrap gap-2">
                                                {initiative.epics.map(epicKey => (
                                                    <span key={epicKey} className="inline-flex items-center px-2 py-1 rounded text-xs font-medium bg-blue-50 text-blue-700 border border-blue-100">
                                                        {epicKey}
                                                    </span>
                                                ))}
                                                {initiative.epics.length === 0 && <span className="text-slate-400 italic">No epics assigned</span>}
                                            </div>
                                        </td>
                                    </tr>
                                );
                            })}
                        </tbody>
                    </table>
                </div>
            )}
        </div>
    );
}
