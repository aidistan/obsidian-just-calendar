import Obsidian from 'obsidian';

// Add complementary declarations for Obsidian's internal APIs
declare module 'obsidian' {
    interface App {
        internalPlugins: {
            getPluginById(id: string): null | {
                enabled: boolean;
                instance: any;
            };
        };
        plugins: {
            disablePlugin(id: string): Promise<void>;
        };
    }
}
