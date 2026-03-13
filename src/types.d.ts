import Obsidian from 'obsidian';

// Add complementary declarations for Obsidian's internal APIs
declare module 'obsidian' {
  interface App {
    internalPlugins: {
      getPluginById(id: string): null | {
        enabled: boolean;
        instance: Obsidian.Plugin;
      };
      getPluginById(id: 'daily-notes'): null | {
        enabled: boolean;
        instance: Obsidian.Plugin & {
          options: {
            format: string,
            folder: string,
            template: string
          }
        }
      };
    };
    plugins: {
      disablePlugin(id: string): Promise<void>;
    };
  }
}
