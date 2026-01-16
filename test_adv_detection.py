

if __name__ == '__main__':
    import sys
    from ai_engine.advanced_scene_detection import AdvancedSceneDetector
    d = AdvancedSceneDetector()
    print(d.detect(sys.argv[1]))
