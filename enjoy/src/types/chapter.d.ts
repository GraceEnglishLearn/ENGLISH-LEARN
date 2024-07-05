type ChapterType = {
  id: string;
  sequence: number;
  keywords: string[];
  title: string;
  content: string;
  course?: CourseType;
  translations?: {
    language: string;
    content: string;
  }[];
  examples?: {
    id: string;
    keywords: string[];
    language: string;
    content: string;
    audioUrl?: string;
    translations?: {
      language: string;
      content: string;
    }[];
  }[];
};
