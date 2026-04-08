import { AgenticFileSystem } from 'agentic-filesystem';

declare class AgenticShell {
    private fs;
    private cwd;
    private env;
    private jobs;
    private nextJobId;
    setEnv(key: string, value: string): void;
    private substituteEnv;
    private substituteCommands;
    constructor(fs: AgenticFileSystem);
    getEnv(key: string): string | undefined;
    private isBackground;
    exec(command: string, depth?: number): Promise<{
        output: string;
        exitCode: number;
    }>;
    private execPipeline;
    private jobs_cmd;
    private fg;
    private bg;
    private exitCodeFor;
    private execSingle;
    private execSingleWithError;
    private execWithStdin;
    private checkWritable;
    private isErrorOutput;
    private fsError;
    private normalizePath;
    private resolve;
    private parseArgs;
    private matchGlob;
    private expandGlob;
    private expandPathArgs;
    private ls;
    private cat;
    private grep;
    private grepStream;
    private findRecursive;
    private find;
    private cd;
    private parentOf;
    private mkdirOne;
    private mkdir;
    private rmRecursive;
    private rm;
    private mv;
    private cp;
    private copyRecursive;
    private touch;
    private head;
    private tail;
    private wc;
}

export { AgenticShell };
