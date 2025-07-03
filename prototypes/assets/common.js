/* ==========================================================================
   AI机器人教学APP - 通用JavaScript文件
   为6-14岁儿童设计的友好交互功能
   ========================================================================== */

// 错误处理工具函数
function safeExecute(fn, fallback = null, context = 'Unknown') {
  try {
    return fn();
  } catch (error) {
    console.warn(`[${context}] Error caught and handled:`, error.message);
    return fallback;
  }
}

function safeGetElement(selector, context = document) {
  try {
    const element = context.querySelector(selector);
    if (!element) {
      console.warn(`Element not found: ${selector}`);
    }
    return element;
  } catch (error) {
    console.warn(`Error selecting element ${selector}:`, error.message);
    return null;
  }
}

function safeAddEventListener(element, event, handler, options = {}) {
  if (!element || typeof element.addEventListener !== 'function') {
    console.warn('Invalid element for event listener:', element);
    return false;
  }
  
  try {
    const wrappedHandler = function(e) {
      try {
        handler.call(this, e);
      } catch (error) {
        console.warn(`Event handler error for ${event}:`, error.message);
      }
    };
    
    element.addEventListener(event, wrappedHandler, options);
    return true;
  } catch (error) {
    console.warn(`Failed to add event listener for ${event}:`, error.message);
    return false;
  }
}

// 全局常量定义
const APP_CONFIG = {
  // 年龄段配置
  AGE_GROUPS: {
    YOUNG: '6-8',
    MIDDLE: '9-11',
    SENIOR: '12-14'
  },
  
  // 设备类型
  DEVICE_TYPES: {
    PHONE: 'phone',
    TABLET: 'tablet',
    DESKTOP: 'desktop'
  },
  
  // 动画配置
  ANIMATION: {
    FAST: 150,
    NORMAL: 300,
    SLOW: 500
  },
  
  // 拖拽配置
  DRAG: {
    LONG_PRESS_DELAY: 150,
    SNAP_DISTANCE: 30,
    MOUSE_SNAP_DISTANCE: 15
  },
  
  // 响应式断点
  BREAKPOINTS: {
    SM: 640,
    MD: 768,
    LG: 1024,
    XL: 1280
  }
};

// 设备检测和适配
class DeviceAdapter {
  constructor() {
    this.deviceType = safeExecute(() => this.detectDeviceType(), APP_CONFIG.DEVICE_TYPES.DESKTOP, 'DeviceAdapter.detectDeviceType');
    this.isTouch = safeExecute(() => this.detectTouchDevice(), false, 'DeviceAdapter.detectTouchDevice');
    this.screenSize = safeExecute(() => this.getScreenSize(), { width: 1024, height: 768 }, 'DeviceAdapter.getScreenSize');
    this.orientation = safeExecute(() => this.getOrientation(), 'landscape', 'DeviceAdapter.getOrientation');
    
    this.bindEvents();
  }
  
  detectDeviceType() {
    const width = window?.innerWidth || 1024;
    if (width < APP_CONFIG.BREAKPOINTS.MD) return APP_CONFIG.DEVICE_TYPES.PHONE;
    if (width < APP_CONFIG.BREAKPOINTS.LG) return APP_CONFIG.DEVICE_TYPES.TABLET;
    return APP_CONFIG.DEVICE_TYPES.DESKTOP;
  }
  
  detectTouchDevice() {
    return ('ontouchstart' in window) || (navigator?.maxTouchPoints > 0);
  }
  
  getScreenSize() {
    return {
      width: window?.innerWidth || 1024,
      height: window?.innerHeight || 768
    };
  }
  
  getOrientation() {
    const width = window?.innerWidth || 1024;
    const height = window?.innerHeight || 768;
    return width > height ? 'landscape' : 'portrait';
  }
  
  bindEvents() {
    if (typeof window !== 'undefined') {
      safeAddEventListener(window, 'resize', this.handleResize.bind(this));
      safeAddEventListener(window, 'orientationchange', this.handleOrientationChange.bind(this));
    }
  }
  
  handleResize() {
    safeExecute(() => {
      this.screenSize = this.getScreenSize();
      this.deviceType = this.detectDeviceType();
      this.orientation = this.getOrientation();
      
      // 触发自定义事件
      if (window?.dispatchEvent) {
        window.dispatchEvent(new CustomEvent('devicechange', {
          detail: {
            deviceType: this.deviceType,
            screenSize: this.screenSize,
            orientation: this.orientation
          }
        }));
      }
    }, null, 'DeviceAdapter.handleResize');
  }
  
  handleOrientationChange() {
    setTimeout(() => {
      safeExecute(() => this.handleResize(), null, 'DeviceAdapter.handleOrientationChange');
    }, 100);
  }
}

// 页面导航管理器
class NavigationManager {
  constructor() {
    this.currentPage = '';
    this.pageStack = [];
    this.transitions = new Map();
    
    safeExecute(() => this.initializeTransitions(), null, 'NavigationManager.initializeTransitions');
  }
  
  initializeTransitions() {
    // 定义页面切换动画
    this.transitions.set('slide-left', {
      out: 'translateX(-100%)',
      in: 'translateX(0%)'
    });
    
    this.transitions.set('slide-right', {
      out: 'translateX(100%)',
      in: 'translateX(0%)'
    });
    
    this.transitions.set('fade', {
      out: 'opacity: 0',
      in: 'opacity: 1'
    });
  }
  
  navigateTo(pageId, transition = 'slide-left', addToStack = true) {
    if (!pageId || typeof pageId !== 'string') {
      console.warn('Invalid pageId provided to navigateTo:', pageId);
      return;
    }
    
    const currentPageElement = safeGetElement(`#${this.currentPage}`);
    const targetPageElement = safeGetElement(`#${pageId}`);
    
    if (!targetPageElement) {
      console.error(`Page ${pageId} not found`);
      return;
    }
    
    // 添加到页面栈
    if (addToStack && this.currentPage) {
      this.pageStack.push(this.currentPage);
    }
    
    // 执行页面切换动画
    safeExecute(() => {
      this.executeTransition(currentPageElement, targetPageElement, transition);
    }, null, 'NavigationManager.executeTransition');
    
    this.currentPage = pageId;
    
    // 触发页面切换事件
    safeExecute(() => {
      if (window?.dispatchEvent) {
        window.dispatchEvent(new CustomEvent('pagechange', {
          detail: { pageId, transition }
        }));
      }
    }, null, 'NavigationManager.dispatchEvent');
  }
  
  goBack() {
    if (this.pageStack.length > 0) {
      const previousPage = this.pageStack.pop();
      this.navigateTo(previousPage, 'slide-right', false);
    }
  }
  
  executeTransition(fromElement, toElement, transitionType) {
    const transition = this.transitions.get(transitionType);
    if (!transition) return;
    
    if (fromElement && fromElement.style) {
      fromElement.style.transform = transition.out;
      fromElement.style.opacity = '0';
      setTimeout(() => {
        if (fromElement?.classList) {
          fromElement.classList.add('hidden');
        }
      }, APP_CONFIG.ANIMATION.NORMAL);
    }
    
    if (toElement && toElement.style && toElement.classList) {
      toElement.classList.remove('hidden');
      toElement.style.transform = transition.in;
      toElement.style.opacity = '1';
    }
  }
}

// 拖拽交互管理器
class DragManager {
  constructor(options = {}) {
    this.options = {
      snapDistance: APP_CONFIG.DRAG.SNAP_DISTANCE,
      longPressDelay: APP_CONFIG.DRAG.LONG_PRESS_DELAY,
      ...options
    };
    
    this.isDragging = false;
    this.dragElement = null;
    this.dragPreview = null;
    this.dropZones = [];
    this.startPosition = { x: 0, y: 0 };
    this.currentPosition = { x: 0, y: 0 };
    this.longPressTimer = null;
    
    safeExecute(() => this.bindEvents(), null, 'DragManager.bindEvents');
  }
  
  bindEvents() {
    if (typeof document === 'undefined') return;
    
    // 鼠标事件
    safeAddEventListener(document, 'mousedown', this.handleMouseDown.bind(this));
    safeAddEventListener(document, 'mousemove', this.handleMouseMove.bind(this));
    safeAddEventListener(document, 'mouseup', this.handleMouseUp.bind(this));
    
    // 触摸事件
    safeAddEventListener(document, 'touchstart', this.handleTouchStart.bind(this), { passive: false });
    safeAddEventListener(document, 'touchmove', this.handleTouchMove.bind(this), { passive: false });
    safeAddEventListener(document, 'touchend', this.handleTouchEnd.bind(this));
  }
  
  handleMouseDown(event) {
    if (!event?.target) return;
    
    const draggable = event.target.closest('[draggable="true"]');
    if (!draggable) return;
    
    safeExecute(() => {
      this.startDrag(draggable, event.clientX || 0, event.clientY || 0);
    }, null, 'DragManager.handleMouseDown');
  }
  
  handleTouchStart(event) {
    if (!event?.target || !event?.touches?.[0]) return;
    
    const draggable = event.target.closest('[draggable="true"]');
    if (!draggable) return;
    
    const touch = event.touches[0];
    this.longPressTimer = setTimeout(() => {
      safeExecute(() => {
        this.startDrag(draggable, touch.clientX || 0, touch.clientY || 0);
      }, null, 'DragManager.handleTouchStart');
    }, this.options.longPressDelay);
  }
  
  startDrag(element, x, y) {
    if (!element) return;
    
    this.isDragging = true;
    this.dragElement = element;
    this.startPosition = { x: x || 0, y: y || 0 };
    this.currentPosition = { x: x || 0, y: y || 0 };
    
    // 创建拖拽预览
    safeExecute(() => this.createDragPreview(element), null, 'DragManager.createDragPreview');
    
    // 添加拖拽样式
    if (element.classList && element.style) {
      element.classList.add('dragging');
      element.style.opacity = '0.5';
    }
    
    // 触发拖拽开始事件
    safeExecute(() => {
      if (element.dispatchEvent) {
        element.dispatchEvent(new CustomEvent('dragstart', {
          detail: { x, y }
        }));
      }
    }, null, 'DragManager.startDrag.dispatchEvent');
  }
  
  createDragPreview(element) {
    if (!element || !element.cloneNode) return;
    
    this.dragPreview = element.cloneNode(true);
    if (!this.dragPreview) return;
    
    if (this.dragPreview.classList && this.dragPreview.style) {
      this.dragPreview.classList.add('drag-preview');
      this.dragPreview.style.position = 'fixed';
      this.dragPreview.style.pointerEvents = 'none';
      this.dragPreview.style.zIndex = '1000';
      this.dragPreview.style.opacity = '0.8';
      this.dragPreview.style.transform = 'rotate(5deg)';
    }
    
    if (document.body && document.body.appendChild) {
      document.body.appendChild(this.dragPreview);
      this.updatePreviewPosition();
    }
  }
  
  updatePreviewPosition() {
    if (this.dragPreview && this.dragPreview.style) {
      this.dragPreview.style.left = `${this.currentPosition.x - 20}px`;
      this.dragPreview.style.top = `${this.currentPosition.y - 20}px`;
    }
  }
  
  handleMouseMove(event) {
    if (!this.isDragging || !event) return;
    
    this.currentPosition = { x: event.clientX || 0, y: event.clientY || 0 };
    safeExecute(() => {
      this.updatePreviewPosition();
      this.checkDropZones();
    }, null, 'DragManager.handleMouseMove');
  }
  
  handleTouchMove(event) {
    if (this.longPressTimer) {
      clearTimeout(this.longPressTimer);
      this.longPressTimer = null;
    }
    
    if (!this.isDragging || !event?.touches?.[0]) return;
    
    if (event.preventDefault) {
      event.preventDefault();
    }
    
    const touch = event.touches[0];
    this.currentPosition = { x: touch.clientX || 0, y: touch.clientY || 0 };
    safeExecute(() => {
      this.updatePreviewPosition();
      this.checkDropZones();
    }, null, 'DragManager.handleTouchMove');
  }
  
  checkDropZones() {
    const dropZone = safeExecute(() => this.findDropZone(), null, 'DragManager.findDropZone');
    
    // 移除之前的高亮
    safeExecute(() => {
      const zones = document.querySelectorAll('.drop-zone-highlight');
      zones.forEach(zone => {
        if (zone?.classList) {
          zone.classList.remove('drop-zone-highlight');
        }
      });
    }, null, 'DragManager.removeHighlight');
    
    // 高亮当前的放置区域
    if (dropZone && dropZone.classList) {
      dropZone.classList.add('drop-zone-highlight');
    }
  }
  
  findDropZone() {
    if (!document?.querySelectorAll) return null;
    
    const zones = document.querySelectorAll('[data-drop-zone]');
    
    for (const zone of zones) {
      if (!zone?.getBoundingClientRect) continue;
      
      const rect = zone.getBoundingClientRect();
      const distance = this.getDistance(
        this.currentPosition.x,
        this.currentPosition.y,
        rect.left + rect.width / 2,
        rect.top + rect.height / 2
      );
      
      if (distance < this.options.snapDistance) {
        return zone;
      }
    }
    
    return null;
  }
  
  getDistance(x1, y1, x2, y2) {
    return Math.sqrt(Math.pow(x2 - x1, 2) + Math.pow(y2 - y1, 2));
  }
  
  handleMouseUp() {
    safeExecute(() => this.endDrag(), null, 'DragManager.handleMouseUp');
  }
  
  handleTouchEnd() {
    if (this.longPressTimer) {
      clearTimeout(this.longPressTimer);
      this.longPressTimer = null;
    }
    safeExecute(() => this.endDrag(), null, 'DragManager.handleTouchEnd');
  }
  
  endDrag() {
    if (!this.isDragging) return;
    
    const dropZone = safeExecute(() => this.findDropZone(), null, 'DragManager.endDrag.findDropZone');
    
    if (dropZone) {
      safeExecute(() => this.handleDrop(dropZone), null, 'DragManager.handleDrop');
    }
    
    // 清理拖拽状态
    safeExecute(() => this.cleanup(), null, 'DragManager.cleanup');
  }
  
  handleDrop(dropZone) {
    if (!dropZone?.dispatchEvent) return;
    
    dropZone.dispatchEvent(new CustomEvent('drop', {
      detail: {
        dragElement: this.dragElement,
        dropZone: dropZone,
        position: this.currentPosition
      }
    }));
  }
  
  cleanup() {
    if (this.dragElement) {
      if (this.dragElement.classList) {
        this.dragElement.classList.remove('dragging');
      }
      if (this.dragElement.style) {
        this.dragElement.style.opacity = '';
      }
    }
    
    if (this.dragPreview && this.dragPreview.remove) {
      this.dragPreview.remove();
    }
    
    safeExecute(() => {
      const zones = document.querySelectorAll('.drop-zone-highlight');
      zones.forEach(zone => {
        if (zone?.classList) {
          zone.classList.remove('drop-zone-highlight');
        }
      });
    }, null, 'DragManager.cleanup.removeHighlight');
    
    this.isDragging = false;
    this.dragElement = null;
    this.dragPreview = null;
  }
}

// 动画效果管理器
class AnimationManager {
  constructor() {
    this.animations = new Map();
    this.runningAnimations = new Set();
  }
  
  // 淡入动画
  fadeIn(element, duration = APP_CONFIG.ANIMATION.NORMAL) {
    return this.animate(element, [
      { opacity: 0 },
      { opacity: 1 }
    ], duration);
  }
  
  // 淡出动画
  fadeOut(element, duration = APP_CONFIG.ANIMATION.NORMAL) {
    return this.animate(element, [
      { opacity: 1 },
      { opacity: 0 }
    ], duration);
  }
  
  // 滑入动画
  slideIn(element, direction = 'up', duration = APP_CONFIG.ANIMATION.NORMAL) {
    const transforms = {
      up: ['translateY(100%)', 'translateY(0%)'],
      down: ['translateY(-100%)', 'translateY(0%)'],
      left: ['translateX(100%)', 'translateX(0%)'],
      right: ['translateX(-100%)', 'translateX(0%)']
    };
    
    return this.animate(element, [
      { transform: transforms[direction][0], opacity: 0 },
      { transform: transforms[direction][1], opacity: 1 }
    ], duration);
  }
  
  // 弹跳动画
  bounce(element, scale = 1.1, duration = APP_CONFIG.ANIMATION.FAST) {
    return this.animate(element, [
      { transform: 'scale(1)' },
      { transform: `scale(${scale})` },
      { transform: 'scale(1)' }
    ], duration);
  }
  
  // 摇摆动画
  wiggle(element, degrees = 15, duration = 600) {
    return this.animate(element, [
      { transform: 'rotate(0deg)' },
      { transform: `rotate(-${degrees}deg)` },
      { transform: `rotate(${degrees}deg)` },
      { transform: `rotate(-${degrees / 2}deg)` },
      { transform: `rotate(${degrees / 2}deg)` },
      { transform: 'rotate(0deg)' }
    ], duration);
  }
  
  // 脉冲动画
  pulse(element, scale = 1.05, duration = 1000) {
    return this.animate(element, [
      { transform: 'scale(1)' },
      { transform: `scale(${scale})` },
      { transform: 'scale(1)' }
    ], duration, { iterations: Infinity });
  }
  
  // 通用动画方法
  animate(element, keyframes, duration, options = {}) {
    if (!element || !element.animate) {
      console.warn('Element does not support Web Animations API');
      return null;
    }
    
    return safeExecute(() => {
      const animation = element.animate(keyframes, {
        duration,
        easing: 'ease-in-out',
        fill: 'forwards',
        ...options
      });
      
      this.runningAnimations.add(animation);
      
      safeAddEventListener(animation, 'finish', () => {
        this.runningAnimations.delete(animation);
      });
      
      return animation;
    }, null, 'AnimationManager.animate');
  }
  
  // 停止元素的所有动画
  stopAnimations(element) {
    if (!element || typeof element.getAnimations !== 'function') {
      console.warn('Element does not support getAnimations method');
      return;
    }
    
    safeExecute(() => {
      const animations = element.getAnimations();
      animations.forEach(animation => {
        if (animation && animation.cancel) {
          animation.cancel();
          this.runningAnimations.delete(animation);
        }
      });
    }, null, 'AnimationManager.stopAnimations');
  }
  
  // 停止所有动画
  stopAllAnimations() {
    safeExecute(() => {
      this.runningAnimations.forEach(animation => {
        if (animation && animation.cancel) {
          animation.cancel();
        }
      });
      this.runningAnimations.clear();
    }, null, 'AnimationManager.stopAllAnimations');
  }
}

// 表单验证管理器
class FormValidator {
  constructor() {
    this.rules = new Map();
    this.messages = new Map();
    
    this.initializeDefaultRules();
  }
  
  initializeDefaultRules() {
    // 必填验证
    this.addRule('required', (value) => {
      return value !== null && value !== undefined && value.toString().trim() !== '';
    }, '此字段为必填项');
    
    // 邮箱验证
    this.addRule('email', (value) => {
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      return emailRegex.test(value);
    }, '请输入有效的邮箱地址');
    
    // 最小长度验证
    this.addRule('minLength', (value, length) => {
      return value.toString().length >= length;
    }, '输入长度不够');
    
    // 最大长度验证
    this.addRule('maxLength', (value, length) => {
      return value.toString().length <= length;
    }, '输入长度超出限制');
    
    // 数字验证
    this.addRule('number', (value) => {
      return !isNaN(value) && !isNaN(parseFloat(value));
    }, '请输入有效的数字');
    
    // 年龄验证（6-14岁）
    this.addRule('age', (value) => {
      const age = parseInt(value);
      return age >= 6 && age <= 14;
    }, '年龄必须在6-14岁之间');
  }
  
  addRule(name, validator, message) {
    this.rules.set(name, validator);
    this.messages.set(name, message);
  }
  
  validateField(element, rules) {
    const value = element.value;
    const errors = [];
    
    for (const rule of rules) {
      const [ruleName, ...params] = rule.split(':');
      const validator = this.rules.get(ruleName);
      
      if (validator && !validator(value, ...params)) {
        errors.push(this.messages.get(ruleName));
      }
    }
    
    this.displayErrors(element, errors);
    return errors.length === 0;
  }
  
  validateForm(formElement) {
    const fields = formElement.querySelectorAll('[data-validate]');
    let isValid = true;
    
    fields.forEach(field => {
      const rules = field.dataset.validate.split('|');
      const fieldValid = this.validateField(field, rules);
      if (!fieldValid) {
        isValid = false;
      }
    });
    
    return isValid;
  }
  
  displayErrors(element, errors) {
    if (!element || !element.parentNode) {
      console.warn('Invalid element provided to displayErrors');
      return;
    }
    
    safeExecute(() => {
      // 移除之前的错误提示
      const existingError = element.parentNode.querySelector('.error-message');
      if (existingError && existingError.remove) {
        existingError.remove();
      }
      
      // 移除错误样式
      if (element.classList) {
        element.classList.remove('error');
      }
      
      if (errors.length > 0) {
        // 添加错误样式
        if (element.classList) {
          element.classList.add('error');
        }
        
        // 创建错误提示
        if (document.createElement) {
          const errorDiv = document.createElement('div');
          errorDiv.className = 'error-message';
          errorDiv.textContent = errors[0]; // 只显示第一个错误
          
          if (element.parentNode.insertBefore) {
            element.parentNode.insertBefore(errorDiv, element.nextSibling);
          }
        }
      }
    }, null, 'FormValidator.displayErrors');
  }
}

// 数据管理器
class DataManager {
  constructor() {
    this.data = new Map();
    this.observers = new Map();
  }
  
  // 设置数据
  set(key, value) {
    const oldValue = this.data.get(key);
    this.data.set(key, value);
    
    // 通知观察者
    this.notifyObservers(key, value, oldValue);
  }
  
  // 获取数据
  get(key) {
    return this.data.get(key);
  }
  
  // 删除数据
  delete(key) {
    const oldValue = this.data.get(key);
    this.data.delete(key);
    this.notifyObservers(key, undefined, oldValue);
  }
  
  // 添加观察者
  observe(key, callback) {
    if (!this.observers.has(key)) {
      this.observers.set(key, new Set());
    }
    this.observers.get(key).add(callback);
  }
  
  // 移除观察者
  unobserve(key, callback) {
    const keyObservers = this.observers.get(key);
    if (keyObservers) {
      keyObservers.delete(callback);
    }
  }
  
  // 通知观察者
  notifyObservers(key, newValue, oldValue) {
    const keyObservers = this.observers.get(key);
    if (keyObservers) {
      keyObservers.forEach(callback => {
        callback(newValue, oldValue, key);
      });
    }
  }
}

// 模拟数据生成器
class MockDataGenerator {
  constructor() {
    this.studentNames = [
      '小明', '小红', '小刚', '小丽', '小华', '小芳', '小军', '小燕',
      '小杰', '小梅', '小强', '小雨', '小雪', '小鹏', '小慧', '小磊'
    ];
    
    this.courseNames = [
      'Python基础编程', 'Scratch创意编程', '机器人控制入门', 'AI图像识别',
      '数学思维训练', '逻辑推理游戏', 'Web前端开发', '游戏开发基础'
    ];
    
    this.homeworkTitles = [
      '循环结构练习', '条件判断作业', '函数定义练习', '变量操作实验',
      '机器人路径规划', '图像分类项目', '算法设计挑战', '创意编程作品'
    ];
  }
  
  // 生成随机学生数据
  generateStudents(count = 10) {
    const students = [];
    
    for (let i = 0; i < count; i++) {
      students.push({
        id: this.generateId(),
        name: this.getRandomItem(this.studentNames),
        age: this.getRandomInt(6, 14),
        grade: this.getRandomInt(1, 6),
        avatar: this.generateAvatar(),
        progress: this.getRandomInt(0, 100),
        level: this.getRandomInt(1, 10),
        points: this.getRandomInt(0, 1000),
        lastActive: this.generateRecentDate(),
        courses: this.generateRandomCourses()
      });
    }
    
    return students;
  }
  
  // 生成随机课程数据
  generateCourses(count = 8) {
    const courses = [];
    
    for (let i = 0; i < count; i++) {
      courses.push({
        id: this.generateId(),
        title: this.getRandomItem(this.courseNames),
        description: '这是一门有趣的编程课程，适合初学者学习。',
        difficulty: this.getRandomItem(['初级', '中级', '高级']),
        duration: this.getRandomInt(30, 120),
        students: this.getRandomInt(10, 50),
        rating: (Math.random() * 2 + 3).toFixed(1),
        thumbnail: this.generateThumbnail(),
        category: this.getRandomItem(['编程', 'AI', '机器人', '数学']),
        progress: this.getRandomInt(0, 100)
      });
    }
    
    return courses;
  }
  
  // 生成随机作业数据
  generateHomework(count = 6) {
    const homework = [];
    
    for (let i = 0; i < count; i++) {
      homework.push({
        id: this.generateId(),
        title: this.getRandomItem(this.homeworkTitles),
        description: '完成相关编程练习，提交代码文件。',
        subject: this.getRandomItem(['编程', 'AI', '机器人', '数学']),
        dueDate: this.generateFutureDate(),
        status: this.getRandomItem(['待完成', '已提交', '已批改', '逾期']),
        priority: this.getRandomItem(['高', '中', '低']),
        points: this.getRandomInt(10, 100),
        submissions: this.getRandomInt(0, 30),
        totalStudents: this.getRandomInt(25, 35)
      });
    }
    
    return homework;
  }
  
  // 生成图表数据
  generateChartData(type, points = 10) {
    const data = [];
    
    switch (type) {
      case 'line':
        for (let i = 0; i < points; i++) {
          data.push({
            x: i,
            y: this.getRandomInt(0, 100)
          });
        }
        break;
        
      case 'bar':
        const categories = ['周一', '周二', '周三', '周四', '周五', '周六', '周日'];
        categories.forEach(category => {
          data.push({
            category,
            value: this.getRandomInt(0, 100)
          });
        });
        break;
        
      case 'pie':
        const subjects = ['编程', 'AI', '机器人', '数学'];
        subjects.forEach(subject => {
          data.push({
            label: subject,
            value: this.getRandomInt(10, 40)
          });
        });
        break;
    }
    
    return data;
  }
  
  // 工具方法
  generateId() {
    return Math.random().toString(36).substr(2, 9);
  }
  
  getRandomInt(min, max) {
    return Math.floor(Math.random() * (max - min + 1)) + min;
  }
  
  getRandomItem(array) {
    return array[Math.floor(Math.random() * array.length)];
  }
  
  generateAvatar() {
    const colors = ['#FF6B6B', '#4ECDC4', '#45B7D1', '#96CEB4', '#FECA57', '#FF9FF3'];
    return this.getRandomItem(colors);
  }
  
  generateThumbnail() {
    return `https://picsum.photos/300/200?random=${this.getRandomInt(1, 1000)}`;
  }
  
  generateRecentDate() {
    const now = new Date();
    const hours = this.getRandomInt(1, 24);
    return new Date(now.getTime() - hours * 60 * 60 * 1000);
  }
  
  generateFutureDate() {
    const now = new Date();
    const days = this.getRandomInt(1, 7);
    return new Date(now.getTime() + days * 24 * 60 * 60 * 1000);
  }
  
  generateRandomCourses() {
    const count = this.getRandomInt(2, 5);
    const courses = [];
    
    for (let i = 0; i < count; i++) {
      courses.push({
        name: this.getRandomItem(this.courseNames),
        progress: this.getRandomInt(0, 100)
      });
    }
    
    return courses;
  }
}

// 机器人控制模拟器
class RobotSimulator {
  constructor() {
    this.position = { x: 0, y: 0 };
    this.direction = 0; // 度数
    this.sensors = {
      distance: 0,
      light: 0,
      temperature: 25,
      compass: 0,
      touch: false
    };
    
    this.obstacles = [];
    this.isRunning = false;
    this.commandQueue = [];
    this.sensorInterval = null; // To store setInterval ID
    
    this.initializeSensors();
  }
  
  initializeSensors() {
    // 模拟传感器数据更新
    safeExecute(() => {
      this.sensorInterval = setInterval(() => {
        safeExecute(() => this.updateSensors(), null, 'RobotSimulator.updateSensors');
      }, 100);
    }, null, 'RobotSimulator.initializeSensors');
  }
  
  updateSensors() {
    // 模拟传感器数据变化
    this.sensors.distance = 15.6 + Math.random() * 5;
    this.sensors.light = 450 + Math.random() * 100;
    this.sensors.temperature = 24 + Math.random() * 2;
    this.sensors.compass = this.direction;
    
    // 触发传感器更新事件
    safeExecute(() => {
      this.dispatchEvent('sensorUpdate', this.sensors);
    }, null, 'RobotSimulator.updateSensors.dispatchEvent');
  }
  
  // 移动命令
  move(steps) {
    return new Promise((resolve) => {
      const startX = this.position.x;
      const startY = this.position.y;
      
      const endX = startX + steps * Math.cos(this.direction * Math.PI / 180);
      const endY = startY + steps * Math.sin(this.direction * Math.PI / 180);
      
      // Assume animateMovement exists and is handled elsewhere, or mock it.
      // For this context, we'll just update position and resolve.
      this.position.x = endX;
      this.position.y = endY;
      resolve();
    });
  }
  
  // 转向命令
  turn(degrees) {
    return new Promise((resolve) => {
      const startDirection = this.direction;
      const endDirection = (startDirection + degrees) % 360;
      
      // Assume animateRotation exists or mock it.
      this.direction = endDirection;
      resolve();
    });
  }
  
  // 等待命令
  wait(milliseconds) {
    return new Promise((resolve) => {
      setTimeout(resolve, milliseconds);
    });
  }
  
  // 执行命令序列
  async executeCommands(commands) {
    if (!Array.isArray(commands)) {
      console.warn('Invalid commands array provided to executeCommands');
      return;
    }
    
    this.isRunning = true;
    this.commandQueue = [...commands];
    
    try {
      for (const command of commands) {
        await safeExecute(async () => {
          await this.executeCommand(command);
        }, null, 'RobotSimulator.executeCommand');
        
        // 检查是否被停止
        if (!this.isRunning) break;
      }
    } catch (error) {
      console.error('Robot execution error:', error);
      safeExecute(() => {
        this.dispatchEvent('error', { error: error.message });
      }, null, 'RobotSimulator.executeCommands.dispatchError');
    } finally {
      this.isRunning = false;
      safeExecute(() => {
        this.dispatchEvent('executionComplete');
      }, null, 'RobotSimulator.executeCommands.dispatchComplete');
    }
  }
  
  executeCommand(command) {
    if (!command || typeof command !== 'object') {
      throw new Error('Invalid command object');
    }
    
    switch (command.type) {
      case 'move':
        return this.move(command.value || 0);
      case 'turn':
        return this.turn(command.value || 0);
      case 'wait':
        return this.wait(command.value || 0);
      default:
        throw new Error(`Unknown command: ${command.type}`);
    }
  }
  
  // 停止执行
  stop() {
    this.isRunning = false;
    safeExecute(() => {
      if (this.sensorInterval) {
        clearInterval(this.sensorInterval);
        this.sensorInterval = null;
      }
    }, null, 'RobotSimulator.stop');
  }
  
  // 事件分发方法
  dispatchEvent(eventType, data) {
    if (typeof window !== 'undefined' && window.dispatchEvent) {
      const event = new CustomEvent(`robot-${eventType}`, {
        detail: data || {}
      });
      window.dispatchEvent(event);
    }
  }
}

// 全局实例管理
const AppInstances = {
  deviceAdapter: null,
  navigationManager: null,
  dragManager: null,
  animationManager: null,
  formValidator: null,
  dataManager: null,
  mockDataGenerator: null,
  robotSimulator: null,
  
  // 初始化所有实例
  initialize() {
    safeExecute(() => {
      this.deviceAdapter = new DeviceAdapter();
      this.navigationManager = new NavigationManager();
      this.dragManager = new DragManager();
      this.animationManager = new AnimationManager();
      this.formValidator = new FormValidator();
      this.dataManager = new DataManager();
      this.mockDataGenerator = new MockDataGenerator();
      this.robotSimulator = new RobotSimulator();
    }, null, 'AppInstances.initialize');
  },
  
  // 清理所有实例
  cleanup() {
    safeExecute(() => {
      if (this.robotSimulator && this.robotSimulator.stop) {
        this.robotSimulator.stop();
      }
      if (this.animationManager && this.animationManager.stopAllAnimations) {
        this.animationManager.stopAllAnimations();
      }
      if (this.dragManager && this.dragManager.cleanup) {
        this.dragManager.cleanup();
      }
    }, null, 'AppInstances.cleanup');
  }
};

// 页面卸载时清理资源
safeAddEventListener(window, 'beforeunload', () => {
  AppInstances.cleanup();
});

// DOM加载完成后初始化
if (document.readyState === 'loading') {
  safeAddEventListener(document, 'DOMContentLoaded', () => {
    AppInstances.initialize();
  });
} else {
  AppInstances.initialize();
}

// 导出全局引用以便其他脚本使用
if (typeof window !== 'undefined') {
  window.AppInstances = AppInstances;
  window.safeExecute = safeExecute;
  window.safeGetElement = safeGetElement;
  window.safeAddEventListener = safeAddEventListener;
}